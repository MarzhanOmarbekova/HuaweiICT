"""
VoltAI — complete urls.py
Replace voltai_backend/voltai_backend/urls.py with this file.
"""
from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from authentication.views import RegisterView, LoginView
from optimization.views import WindOptimizationView, OptimizationHistoryView
from trading.views import (
    DeviceListCreateView, DeviceDetailView,
    RecordEnergyView, UserBalanceView,
    MarketplaceView, CreateOfferView, OfferDetailView,
    PlaceBidView, OfferBidsView,
    BuyEnergyView,
    TransactionHistoryView,
    BlockchainHistoryView, BlockchainTxSearchView,
    DashboardStatsView,
)

from trading.views import MyOffersView

urlpatterns = [
    path("admin/", admin.site.urls),

    # ── Auth ──────────────────────────────────────────────
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/login/", LoginView.as_view(), name="login"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # ── Dashboard ─────────────────────────────────────────
    path("api/dashboard/", DashboardStatsView.as_view(), name="dashboard"),

    # ── Devices ───────────────────────────────────────────
    path("api/devices/", DeviceListCreateView.as_view(), name="devices"),
    path("api/devices/<uuid:device_id>/", DeviceDetailView.as_view(), name="device_detail"),

    # ── Energy Recording ──────────────────────────────────
    path("api/energy/record/", RecordEnergyView.as_view(), name="record_energy"),

    # ── Balance ───────────────────────────────────────────
    path("api/balance/", UserBalanceView.as_view(), name="balance"),

    # ── Marketplace ───────────────────────────────────────
    path("api/marketplace/", MarketplaceView.as_view(), name="marketplace"),

    # ── Offers ────────────────────────────────────────────
    path('api/my-offers/', MyOffersView.as_view(), name='my-offers'),
    path("api/offers/", CreateOfferView.as_view(), name="create_offer"),
    path("api/offers/<uuid:offer_id>/", OfferDetailView.as_view(), name="offer_detail"),
    path("api/offers/<uuid:offer_id>/bids/", OfferBidsView.as_view(), name="offer_bids"),

    # ── Bidding ───────────────────────────────────────────
    path("api/bids/", PlaceBidView.as_view(), name="place_bid"),

    # ── Trading ───────────────────────────────────────────
    path("api/buy/", BuyEnergyView.as_view(), name="buy_energy"),

    # ── Transactions ──────────────────────────────────────
    path("api/transactions/", TransactionHistoryView.as_view(), name="transactions"),

    # ── Blockchain ────────────────────────────────────────
    path("api/blockchain/", BlockchainHistoryView.as_view(), name="blockchain"),
    path("api/blockchain/tx/<str:tx_id>/", BlockchainTxSearchView.as_view(), name="blockchain_tx"),

    # ── Wind Optimization (existing) ──────────────────────
    path("api/optimize-wind/", WindOptimizationView.as_view(), name="optimize_wind"),
    path("api/optimization-history/", OptimizationHistoryView.as_view(), name="history"),
]
