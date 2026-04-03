"""
VoltAI Trading Models — extends existing auth + optimization models.
Add this file as: voltai_backend/trading/models.py
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class EnergyDevice(models.Model):
    DEVICE_TYPES = [
        ("wind", "Wind Turbine"),
        ("solar", "Solar Panel"),
        ("hybrid", "Hybrid"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="devices"
    )
    name = models.CharField(max_length=200)
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPES)
    capacity_kw = models.FloatField()                   # rated capacity
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    installed_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "energy_devices"

    def __str__(self):
        return f"{self.name} ({self.device_type}) — {self.user.email}"


class EnergyData(models.Model):
    """Recorded energy generation events."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(EnergyDevice, on_delete=models.CASCADE, related_name="readings")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="energy_records"
    )
    energy_kwh = models.FloatField()
    recorded_at = models.DateTimeField(default=timezone.now)
    source = models.CharField(max_length=50, default="manual")  # manual | api | sensor

    class Meta:
        db_table = "energy_data"
        ordering = ["-recorded_at"]


class UserBalance(models.Model):
    """
    Energy credit balance for each user.
    1 credit = 1 kWh.
    Also stores fiat-equivalent credits for purchasing energy.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="balance"
    )
    energy_credits = models.FloatField(default=0.0)        # kWh produced / acquired
    locked_credits = models.FloatField(default=0.0)        # credits locked during trade
    coin_balance = models.FloatField(default=100.0)        # platform coin for buying
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_balances"

    @property
    def available_credits(self) -> float:
        return max(0.0, self.energy_credits - self.locked_credits)

    def __str__(self):
        return f"{self.user.email}: {self.energy_credits:.2f} kWh"


class EnergyOffer(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("partially_sold", "Partially Sold"),
        ("sold", "Sold Out"),
        ("cancelled", "Cancelled"),
        ("expired", "Expired"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="offers"
    )
    device = models.ForeignKey(
        EnergyDevice, on_delete=models.SET_NULL, null=True, blank=True, related_name="offers"
    )
    energy_amount = models.FloatField()                # total kWh offered
    available_amount = models.FloatField()             # remaining kWh
    price_per_kwh = models.FloatField()                # in platform coins
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    description = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "energy_offers"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["seller", "status"]),
        ]

    def __str__(self):
        return f"Offer {self.id}: {self.energy_amount} kWh @ {self.price_per_kwh}"


class EnergyBid(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("withdrawn", "Withdrawn"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    offer = models.ForeignKey(EnergyOffer, on_delete=models.CASCADE, related_name="bids")
    bidder = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bids"
    )
    energy_amount = models.FloatField()
    bid_price_per_kwh = models.FloatField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "energy_bids"
        ordering = ["-bid_price_per_kwh", "-created_at"]


class EnergyContract(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("executed", "Executed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    offer = models.ForeignKey(EnergyOffer, on_delete=models.PROTECT, related_name="contracts")
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="sold_contracts"
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="bought_contracts"
    )
    energy_amount = models.FloatField()
    price_per_kwh = models.FloatField()
    total_price = models.FloatField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    contract_hash = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    executed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = "energy_contracts"
        ordering = ["-created_at"]


class Transaction(models.Model):
    TX_TYPES = [
        ("trade", "P2P Trade"),
        ("mint", "Energy Minted"),
        ("burn", "Energy Burned"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.OneToOneField(
        EnergyContract, on_delete=models.PROTECT, null=True, blank=True, related_name="transaction"
    )
    transaction_id = models.CharField(max_length=36, unique=True)
    tx_type = models.CharField(max_length=10, choices=TX_TYPES)
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True, related_name="sold_txs"
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True, related_name="bought_txs"
    )
    energy_amount = models.FloatField()
    price_per_kwh = models.FloatField(default=0.0)
    total_price = models.FloatField(default=0.0)
    contract_hash = models.CharField(max_length=64, blank=True)
    blockchain_block_index = models.IntegerField(null=True, blank=True)
    blockchain_block_hash = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "transactions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["seller", "created_at"]),
            models.Index(fields=["buyer", "created_at"]),
        ]


class BlockchainBlock(models.Model):
    """Mirror of blockchain blocks in PostgreSQL for fast querying."""
    index = models.IntegerField(unique=True)
    block_hash = models.CharField(max_length=64, unique=True)
    previous_hash = models.CharField(max_length=64)
    nonce = models.IntegerField(default=0)
    timestamp = models.FloatField()
    transaction_count = models.IntegerField(default=0)
    transactions_data = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "blockchain_blocks"
        ordering = ["-index"]

    def __str__(self):
        return f"Block #{self.index} — {self.block_hash[:16]}..."
