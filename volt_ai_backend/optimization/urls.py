from django.urls import path
from .views import WindOptimizeView

urlpatterns = [
    path('optimize-wind/', WindOptimizeView.as_view(), name='optimize-wind'),
]