"""
VoltAI Smart Contract Module
Handles P2P energy trading logic: validation, locking, transfer, finalization.
"""

import uuid
import time
import hashlib
import json
from typing import Optional, Tuple
from enum import Enum


class ContractStatus(str, Enum):
    PENDING = "pending"
    LOCKED = "locked"
    EXECUTED = "executed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ContractError(Exception):
    pass


class SmartContract:
    """
    P2P Energy Trading Smart Contract.
    Manages the lifecycle of an energy trade.
    """

    def __init__(
        self,
        seller_id: int,
        buyer_id: int,
        energy_amount: float,
        price_per_kwh: float,
        offer_id: str,
    ):
        self.contract_id = str(uuid.uuid4())
        self.seller_id = seller_id
        self.buyer_id = buyer_id
        self.energy_amount = energy_amount          # kWh
        self.price_per_kwh = price_per_kwh
        self.total_price = round(energy_amount * price_per_kwh, 4)
        self.offer_id = offer_id
        self.status = ContractStatus.PENDING
        self.created_at = time.time()
        self.executed_at: Optional[float] = None
        self.blockchain_hash: Optional[str] = None
        self.error_message: Optional[str] = None

    # ── Validation ──────────────────────────────────────────────
    def validate(
        self,
        seller_balance: float,
        buyer_balance_credits: float,
        offer_available_kwh: float,
    ) -> Tuple[bool, str]:
        """
        Returns (is_valid, error_message).
        """
        if self.seller_id == self.buyer_id:
            return False, "Seller and buyer cannot be the same user"

        if self.energy_amount <= 0:
            return False, "Energy amount must be positive"

        if seller_balance < self.energy_amount:
            return False, f"Seller has insufficient energy credits: {seller_balance:.2f} < {self.energy_amount:.2f}"

        if offer_available_kwh < self.energy_amount:
            return False, f"Offer only has {offer_available_kwh:.2f} kWh available"

        if buyer_balance_credits < self.total_price:
            return False, f"Buyer has insufficient credits: {buyer_balance_credits:.4f} < {self.total_price:.4f}"

        return True, ""

    # ── Execution ────────────────────────────────────────────────
    def execute(self) -> dict:
        """
        Returns the transaction payload to be recorded in DB + blockchain.
        Caller is responsible for DB writes (atomic transaction).
        """
        if self.status not in (ContractStatus.PENDING, ContractStatus.LOCKED):
            raise ContractError(f"Cannot execute contract in status: {self.status}")

        self.status = ContractStatus.EXECUTED
        self.executed_at = time.time()

        tx_payload = {
            "transaction_id": str(uuid.uuid4()),
            "contract_id": self.contract_id,
            "seller_id": self.seller_id,
            "buyer_id": self.buyer_id,
            "energy_amount": self.energy_amount,
            "price_per_kwh": self.price_per_kwh,
            "total_price": self.total_price,
            "offer_id": self.offer_id,
            "timestamp": self.executed_at,
            "tx_type": "trade",
            "status": "confirmed",
        }

        # Generate deterministic contract hash
        raw = json.dumps(tx_payload, sort_keys=True)
        self.blockchain_hash = hashlib.sha256(raw.encode()).hexdigest()
        tx_payload["contract_hash"] = self.blockchain_hash

        return tx_payload

    def cancel(self, reason: str = ""):
        self.status = ContractStatus.CANCELLED
        self.error_message = reason

    def to_dict(self) -> dict:
        return {
            "contract_id": self.contract_id,
            "seller_id": self.seller_id,
            "buyer_id": self.buyer_id,
            "energy_amount": self.energy_amount,
            "price_per_kwh": self.price_per_kwh,
            "total_price": self.total_price,
            "offer_id": self.offer_id,
            "status": self.status,
            "created_at": self.created_at,
            "executed_at": self.executed_at,
            "blockchain_hash": self.blockchain_hash,
            "error_message": self.error_message,
        }


# ── Mint contract (for energy generation) ───────────────────────
def create_mint_transaction(user_id: int, energy_amount: float, device_id: str) -> dict:
    """Generate new energy credits when a device produces energy."""
    tx_id = str(uuid.uuid4())
    payload = {
        "transaction_id": tx_id,
        "contract_id": None,
        "seller_id": None,
        "buyer_id": user_id,
        "energy_amount": energy_amount,
        "price_per_kwh": 0.0,
        "total_price": 0.0,
        "device_id": device_id,
        "timestamp": time.time(),
        "tx_type": "mint",
        "status": "confirmed",
    }
    raw = json.dumps(payload, sort_keys=True)
    payload["contract_hash"] = hashlib.sha256(raw.encode()).hexdigest()
    return payload
