"""
VoltAI Trading Views — full P2P energy trading API
"""

import sys
import os
import time
import uuid

from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from blockchain.bcs_client import invoke_bcs, is_bcs_enabled

# Add blockchain module to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from blockchain.blockchain import get_blockchain
from blockchain.smart_contract import SmartContract, create_mint_transaction

from .models import (
    EnergyDevice, EnergyData, UserBalance, EnergyOffer,
    EnergyBid, EnergyContract, Transaction, BlockchainBlock
)
from .serializers import (
    EnergyDeviceSerializer, EnergyDeviceCreateSerializer,
    EnergyDataSerializer, RecordEnergySerializer,
    UserBalanceSerializer, EnergyOfferSerializer, CreateOfferSerializer,
    EnergyBidSerializer, PlaceBidSerializer, BuyEnergySerializer,
    EnergyContractSerializer, TransactionSerializer, BlockchainBlockSerializer
)


def get_or_create_balance(user) -> UserBalance:
    balance, _ = UserBalance.objects.get_or_create(
        user=user,
        defaults={"energy_credits": 0.0, "locked_credits": 0.0, "coin_balance": 100.0}
    )
    return balance


def mine_and_persist(blockchain, tx_payload: dict) -> dict:
    """Add tx to blockchain, mine block, persist block to DB."""
    blockchain.add_transaction(tx_payload)
    block = blockchain.mine_pending_transactions()

    if block:
        # 1. Находим последний индекс в БД
        last_db_block = BlockchainBlock.objects.order_by('-index').first()
        new_index = (last_db_block.index + 1) if last_db_block else 1

        # 2. Синхронизируем индекс в объекте блока (чтобы хэш соответствовал реальности)
        block.index = new_index

        # 3. Сохраняем в БД, используя вычисленный new_index
        BlockchainBlock.objects.create(
            index=new_index,  # ИСПОЛЬЗУЕМ НОВЫЙ ИНДЕКС
            block_hash=block.hash,
            previous_hash=block.previous_hash,
            nonce=block.nonce,
            timestamp=block.timestamp,
            transaction_count=len(block.transactions),
            transactions_data=block.transactions,
        )
        return {"block_index": new_index, "block_hash": block.hash}
    return {}

# ── Standard Pagination ──────────────────────────────────────────
class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


# ════════════════════════════════════════════════════════════════
# DEVICE MANAGEMENT
# ════════════════════════════════════════════════════════════════

class DeviceListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        devices = EnergyDevice.objects.filter(user=request.user, is_active=True)
        serializer = EnergyDeviceSerializer(devices, many=True)
        return Response({"devices": serializer.data})

    def post(self, request):
        serializer = EnergyDeviceCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        device = EnergyDevice.objects.create(
            user=request.user,
            **serializer.validated_data
        )
        return Response(EnergyDeviceSerializer(device).data, status=status.HTTP_201_CREATED)


class DeviceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, device_id):
        try:
            device = EnergyDevice.objects.get(id=device_id, user=request.user)
        except EnergyDevice.DoesNotExist:
            return Response({"error": "Device not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(EnergyDeviceSerializer(device).data)

    def delete(self, request, device_id):
        try:
            device = EnergyDevice.objects.get(id=device_id, user=request.user)
        except EnergyDevice.DoesNotExist:
            return Response({"error": "Device not found"}, status=status.HTTP_404_NOT_FOUND)
        device.is_active = False
        device.save()
        return Response({"message": "Device deactivated"})


# ════════════════════════════════════════════════════════════════
# ENERGY RECORDING + MINTING
# ════════════════════════════════════════════════════════════════

class RecordEnergyView(APIView):
    """
    POST /api/energy/record/
    Record energy production → mint credits → write to blockchain
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RecordEnergySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        device_id = serializer.validated_data["device_id"]
        energy_kwh = serializer.validated_data["energy_kwh"]

        try:
            device = EnergyDevice.objects.get(id=device_id, user=request.user, is_active=True)
        except EnergyDevice.DoesNotExist:
            return Response({"error": "Device not found"}, status=status.HTTP_404_NOT_FOUND)

        with db_transaction.atomic():
            # Record energy data
            EnergyData.objects.create(
                device=device,
                user=request.user,
                energy_kwh=energy_kwh,
                source="api",
            )

            # Update user balance
            balance = get_or_create_balance(request.user)
            balance.energy_credits += energy_kwh
            balance.save()

            # Create mint transaction + blockchain
            tx_payload = create_mint_transaction(
                user_id=request.user.id,
                energy_amount=energy_kwh,
                device_id=str(device_id)
            )

            blockchain = get_blockchain()
            block_info = mine_and_persist(blockchain, tx_payload)

            Transaction.objects.create(
                transaction_id=tx_payload["transaction_id"],
                tx_type="mint",
                buyer=request.user,
                energy_amount=energy_kwh,
                price_per_kwh=0.0,
                total_price=0.0,
                contract_hash=tx_payload["contract_hash"],
                blockchain_block_index=block_info.get("block_index"),
                blockchain_block_hash=block_info.get("block_hash", ""),
            )

        return Response({
            "message": f"Recorded {energy_kwh} kWh — credits minted",
            "new_balance": balance.energy_credits,
            "transaction_id": tx_payload["transaction_id"],
            "blockchain": block_info,
        }, status=status.HTTP_201_CREATED)


# ════════════════════════════════════════════════════════════════
# USER BALANCE
# ════════════════════════════════════════════════════════════════

class UserBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        balance = get_or_create_balance(request.user)
        serializer = UserBalanceSerializer(balance)
        return Response(serializer.data)


# ════════════════════════════════════════════════════════════════
# MARKETPLACE — OFFERS
# ════════════════════════════════════════════════════════════════

class MarketplaceView(APIView):
    """GET /api/marketplace/ — list all active offers"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        offers = EnergyOffer.objects.filter(status="active").select_related("seller", "device")
        paginator = StandardPagination()
        page = paginator.paginate_queryset(offers, request)
        serializer = EnergyOfferSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class CreateOfferView(APIView):
    """POST /api/offers/ — seller creates an offer"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateOfferSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        energy_amount = data["energy_amount"]

        balance = get_or_create_balance(request.user)
        if balance.available_credits < energy_amount:
            return Response(
                {"error": f"Insufficient energy credits. Available: {balance.available_credits:.2f} kWh"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        device = None
        if data.get("device_id"):
            try:
                device = EnergyDevice.objects.get(id=data["device_id"], user=request.user)
            except EnergyDevice.DoesNotExist:
                return Response({"error": "Device not found"}, status=status.HTTP_404_NOT_FOUND)

        with db_transaction.atomic():
            # Lock credits
            balance.locked_credits += energy_amount
            balance.save()

            offer = EnergyOffer.objects.create(
                seller=request.user,
                device=device,
                energy_amount=energy_amount,
                available_amount=energy_amount,
                price_per_kwh=data["price_per_kwh"],
                description=data.get("description", ""),
                expires_at=data.get("expires_at"),
            )

        return Response(EnergyOfferSerializer(offer).data, status=status.HTTP_201_CREATED)


class OfferDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, offer_id):
        try:
            offer = EnergyOffer.objects.select_related("seller", "device").get(id=offer_id)
        except EnergyOffer.DoesNotExist:
            return Response({"error": "Offer not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(EnergyOfferSerializer(offer).data)

    def delete(self, request, offer_id):
        try:
            offer = EnergyOffer.objects.get(id=offer_id, seller=request.user, status="active")
        except EnergyOffer.DoesNotExist:
            return Response({"error": "Offer not found or not cancellable"}, status=status.HTTP_404_NOT_FOUND)

        with db_transaction.atomic():
            balance = get_or_create_balance(request.user)
            balance.locked_credits -= offer.available_amount
            balance.save()
            offer.status = "cancelled"
            offer.save()

        return Response({"message": "Offer cancelled"})


# ════════════════════════════════════════════════════════════════
# BIDS
# ════════════════════════════════════════════════════════════════

class PlaceBidView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PlaceBidSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            offer = EnergyOffer.objects.get(id=data["offer_id"], status="active")
        except EnergyOffer.DoesNotExist:
            return Response({"error": "Offer not found or not active"}, status=status.HTTP_404_NOT_FOUND)

        if offer.seller == request.user:
            return Response({"error": "Cannot bid on your own offer"}, status=status.HTTP_400_BAD_REQUEST)

        if data["energy_amount"] > offer.available_amount:
            return Response(
                {"error": f"Bid exceeds available: {offer.available_amount:.2f} kWh"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bid = EnergyBid.objects.create(
            offer=offer,
            bidder=request.user,
            energy_amount=data["energy_amount"],
            bid_price_per_kwh=data["bid_price_per_kwh"],
        )
        return Response(EnergyBidSerializer(bid).data, status=status.HTTP_201_CREATED)


class OfferBidsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, offer_id):
        try:
            offer = EnergyOffer.objects.get(id=offer_id, seller=request.user)
        except EnergyOffer.DoesNotExist:
            return Response({"error": "Offer not found"}, status=status.HTTP_404_NOT_FOUND)

        bids = EnergyBid.objects.filter(offer=offer).select_related("bidder")
        return Response(EnergyBidSerializer(bids, many=True).data)


# ════════════════════════════════════════════════════════════════
# BUY ENERGY — instant purchase
# ════════════════════════════════════════════════════════════════

class BuyEnergyView(APIView):
    """
    POST /api/buy/
    Instant purchase → triggers smart contract → updates balances → blockchain
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BuyEnergySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        energy_amount = data["energy_amount"]

        try:
            offer = EnergyOffer.objects.select_related("seller").get(
                id=data["offer_id"], status__in=["active", "partially_sold"]
            )
        except EnergyOffer.DoesNotExist:
            return Response({"error": "Offer not found or not available"}, status=status.HTTP_404_NOT_FOUND)

        if offer.seller == request.user:
            return Response({"error": "Cannot buy your own offer"}, status=status.HTTP_400_BAD_REQUEST)

        if energy_amount > offer.available_amount:
            return Response(
                {"error": f"Requested {energy_amount} kWh but only {offer.available_amount:.2f} kWh available"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        seller_balance = get_or_create_balance(offer.seller)
        buyer_balance = get_or_create_balance(request.user)

        # ── Smart Contract ───────────────────────────────────────
        contract = SmartContract(
            seller_id=offer.seller.id,
            buyer_id=request.user.id,
            energy_amount=energy_amount,
            price_per_kwh=offer.price_per_kwh,
            offer_id=str(offer.id),
        )

        is_valid, error_msg = contract.validate(
            seller_balance=seller_balance.available_credits,
            buyer_balance_credits=buyer_balance.coin_balance,
            offer_available_kwh=offer.available_amount,
        )
        if not is_valid:
            return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)

        tx_payload = contract.execute()

        with db_transaction.atomic():
            # Update seller balance
            seller_balance.energy_credits -= energy_amount
            seller_balance.locked_credits = max(0.0, seller_balance.locked_credits - energy_amount)
            seller_balance.coin_balance += contract.total_price
            seller_balance.save()

            # Update buyer balance
            buyer_balance.energy_credits += energy_amount
            buyer_balance.coin_balance -= contract.total_price
            buyer_balance.save()

            # Update offer
            offer.available_amount -= energy_amount
            if offer.available_amount <= 0.001:
                offer.status = "sold"
            else:
                offer.status = "partially_sold"
            offer.save()

            # Create DB contract
            db_contract = EnergyContract.objects.create(
                offer=offer,
                seller=offer.seller,
                buyer=request.user,
                energy_amount=energy_amount,
                price_per_kwh=offer.price_per_kwh,
                total_price=contract.total_price,
                status="executed",
                contract_hash=contract.blockchain_hash,
                executed_at=timezone.now(),
            )

            # Blockchain
            blockchain = get_blockchain()
            block_info = mine_and_persist(blockchain, tx_payload)

            bcs_result = invoke_bcs('recordTrade', [
                tx_payload['transaction_id'],
                str(energy_amount),
                str(contract.total_price),
                str(offer.seller_id),
                str(request.user.id),
            ])
            if bcs_result:
                logger.info(f'[BCS] Trade anchored: {bcs_result}')

            # DB Transaction record
            tx_record = Transaction.objects.create(
                contract=db_contract,
                transaction_id=tx_payload["transaction_id"],
                tx_type="trade",
                seller=offer.seller,
                buyer=request.user,
                energy_amount=energy_amount,
                price_per_kwh=offer.price_per_kwh,
                total_price=contract.total_price,
                contract_hash=contract.blockchain_hash,
                blockchain_block_index=block_info.get("block_index"),
                blockchain_block_hash=block_info.get("block_hash", ""),
            )

        return Response({
            "message": "Purchase successful",
            "transaction_id": tx_payload["transaction_id"],
            "contract_hash": contract.blockchain_hash,
            "energy_amount": energy_amount,
            "total_price": contract.total_price,
            "blockchain": block_info,
            "your_new_energy_balance": buyer_balance.energy_credits,
            "your_new_coin_balance": buyer_balance.coin_balance,
        }, status=status.HTTP_200_OK)


# ════════════════════════════════════════════════════════════════
# TRANSACTION HISTORY
# ════════════════════════════════════════════════════════════════

class TransactionHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        txs = Transaction.objects.filter(
            seller=request.user
        ) | Transaction.objects.filter(
            buyer=request.user
        )
        txs = txs.select_related("seller", "buyer").order_by("-created_at")
        paginator = StandardPagination()
        page = paginator.paginate_queryset(txs, request)
        serializer = TransactionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


# ════════════════════════════════════════════════════════════════
# BLOCKCHAIN EXPLORER
# ════════════════════════════════════════════════════════════════

class BlockchainHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        blocks = BlockchainBlock.objects.all().order_by("-index")[:50]
        serializer = BlockchainBlockSerializer(blocks, many=True)
        blockchain = get_blockchain()
        return Response({
            "is_valid": blockchain.is_chain_valid(),
            "total_blocks": BlockchainBlock.objects.count(),
            "blocks": serializer.data,
        })


class BlockchainTxSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tx_id):
        blockchain = get_blockchain()
        result = blockchain.find_transaction(tx_id)
        if not result:
            # Try DB
            try:
                tx = Transaction.objects.get(transaction_id=tx_id)
                return Response({
                    "found_in": "database",
                    "transaction": TransactionSerializer(tx).data
                })
            except Transaction.DoesNotExist:
                return Response({"error": "Transaction not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"found_in": "blockchain", **result})


# ════════════════════════════════════════════════════════════════
# USER DASHBOARD STATS
# ════════════════════════════════════════════════════════════════

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        balance = get_or_create_balance(user)

        total_generated = EnergyData.objects.filter(user=user).aggregate(
            total=__import__("django.db.models", fromlist=["Sum"]).Sum("energy_kwh")
        )["total"] or 0.0

        active_offers = EnergyOffer.objects.filter(seller=user, status__in=["active", "partially_sold"]).count()
        total_sold = Transaction.objects.filter(seller=user, tx_type="trade").count()
        total_bought = Transaction.objects.filter(buyer=user, tx_type="trade").count()

        recent_txs = Transaction.objects.filter(
            seller=user
        ) | Transaction.objects.filter(buyer=user)
        recent_txs = recent_txs.order_by("-created_at")[:5]

        return Response({
            "balance": {
                "energy_credits": balance.energy_credits,
                "available_credits": balance.available_credits,
                "locked_credits": balance.locked_credits,
                "coin_balance": balance.coin_balance,
            },
            "stats": {
                "total_generated_kwh": round(total_generated, 2),
                "active_offers": active_offers,
                "total_sales": total_sold,
                "total_purchases": total_bought,
                "devices": EnergyDevice.objects.filter(user=user, is_active=True).count(),
            },
            "recent_transactions": TransactionSerializer(recent_txs, many=True).data,
        })
