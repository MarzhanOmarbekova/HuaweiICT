"""
VoltAI Trading Serializers
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    EnergyDevice, EnergyData, UserBalance, EnergyOffer,
    EnergyBid, EnergyContract, Transaction, BlockchainBlock
)

User = get_user_model()


# ── Device ──────────────────────────────────────────────────────
class EnergyDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnergyDevice
        fields = [
            "id", "name", "device_type", "capacity_kw",
            "latitude", "longitude", "is_active", "installed_at", "created_at"
        ]
        read_only_fields = ["id", "created_at"]


class EnergyDeviceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnergyDevice
        fields = ["name", "device_type", "capacity_kw", "latitude", "longitude"]

    def validate_capacity_kw(self, value):
        if value <= 0:
            raise serializers.ValidationError("Capacity must be positive")
        return value


# ── Energy Data ─────────────────────────────────────────────────
class EnergyDataSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source="device.name", read_only=True)

    class Meta:
        model = EnergyData
        fields = ["id", "device", "device_name", "energy_kwh", "recorded_at", "source"]
        read_only_fields = ["id"]


class RecordEnergySerializer(serializers.Serializer):
    device_id = serializers.UUIDField()
    energy_kwh = serializers.FloatField(min_value=0.001)

    def validate_energy_kwh(self, value):
        if value > 100000:
            raise serializers.ValidationError("Energy amount too large")
        return value


# ── Balance ─────────────────────────────────────────────────────
class UserBalanceSerializer(serializers.ModelSerializer):
    available_credits = serializers.FloatField(read_only=True)

    class Meta:
        model = UserBalance
        fields = ["energy_credits", "locked_credits", "available_credits", "coin_balance", "updated_at"]


# ── Offer ────────────────────────────────────────────────────────
class SellerInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


class EnergyOfferSerializer(serializers.ModelSerializer):
    seller = SellerInfoSerializer(read_only=True)
    total_value = serializers.SerializerMethodField()

    class Meta:
        model = EnergyOffer
        fields = [
            "id", "seller", "device", "energy_amount", "available_amount",
            "price_per_kwh", "status", "description", "expires_at",
            "total_value", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "seller", "available_amount", "status", "created_at", "updated_at"]

    def get_total_value(self, obj):
        return round(obj.available_amount * obj.price_per_kwh, 4)


class CreateOfferSerializer(serializers.Serializer):
    energy_amount = serializers.FloatField(min_value=0.1)
    price_per_kwh = serializers.FloatField(min_value=0.0001)
    device_id = serializers.UUIDField(required=False, allow_null=True)
    description = serializers.CharField(max_length=500, required=False, allow_blank=True)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)

    def validate_energy_amount(self, value):
        if value > 1_000_000:
            raise serializers.ValidationError("Energy amount too large")
        return value


# ── Bid ──────────────────────────────────────────────────────────
class EnergyBidSerializer(serializers.ModelSerializer):
    bidder = SellerInfoSerializer(read_only=True)

    class Meta:
        model = EnergyBid
        fields = ["id", "offer", "bidder", "energy_amount", "bid_price_per_kwh", "status", "created_at"]
        read_only_fields = ["id", "bidder", "status", "created_at"]


class PlaceBidSerializer(serializers.Serializer):
    offer_id = serializers.UUIDField()
    energy_amount = serializers.FloatField(min_value=0.1)
    bid_price_per_kwh = serializers.FloatField(min_value=0.0001)


# ── Buy ──────────────────────────────────────────────────────────
class BuyEnergySerializer(serializers.Serializer):
    offer_id = serializers.UUIDField()
    energy_amount = serializers.FloatField(min_value=0.1)


# ── Contract ─────────────────────────────────────────────────────
class EnergyContractSerializer(serializers.ModelSerializer):
    seller = SellerInfoSerializer(read_only=True)
    buyer = SellerInfoSerializer(read_only=True)

    class Meta:
        model = EnergyContract
        fields = [
            "id", "offer", "seller", "buyer", "energy_amount",
            "price_per_kwh", "total_price", "status",
            "contract_hash", "created_at", "executed_at"
        ]


# ── Transaction ──────────────────────────────────────────────────
class TransactionSerializer(serializers.ModelSerializer):
    seller = SellerInfoSerializer(read_only=True)
    buyer = SellerInfoSerializer(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id", "transaction_id", "tx_type", "seller", "buyer",
            "energy_amount", "price_per_kwh", "total_price",
            "contract_hash", "blockchain_block_index", "blockchain_block_hash",
            "created_at"
        ]


# ── Blockchain Block ─────────────────────────────────────────────
class BlockchainBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockchainBlock
        fields = [
            "index", "block_hash", "previous_hash", "nonce",
            "timestamp", "transaction_count", "transactions_data", "created_at"
        ]
