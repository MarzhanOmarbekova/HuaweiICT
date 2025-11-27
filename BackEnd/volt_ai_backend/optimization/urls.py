from django.urls import path
from .views import optimize_wind_sync_view

urlpatterns = [
    path('optimize-wind/', optimize_wind_sync_view, name='optimize-wind'),
]