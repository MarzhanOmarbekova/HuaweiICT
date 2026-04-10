from django.db import models
from django.conf import settings
import uuid


class WindLocation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wind_locations"
    )

    lat_min = models.FloatField()
    lat_max = models.FloatField()
    lon_min = models.FloatField()
    lon_max = models.FloatField()

    # 4 угловые точки которые пользователь поставил на карте
    # Формат: [{"lat": ..., "lng": ...}, ...]
    boundary_points = models.JSONField(default=list, blank=True)

    num_turbines = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default="pending")

    class Meta:
        db_table = "wind_locations"

    def __str__(self):
        return f"{self.id} ({self.lat_min}, {self.lon_min})"


class AIModelResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wind_location = models.ForeignKey(
        WindLocation, on_delete=models.CASCADE, related_name="results"
    )

    # [{lat, lon, efficiency}] — строго из узлов сетки area_data
    optimal_points = models.JSONField()

    energy_1_month = models.FloatField()
    energy_3_months = models.FloatField()
    energy_6_months = models.FloatField()
    energy_12_months = models.FloatField()

    avg_wind_speed = models.FloatField()
    avg_elevation = models.FloatField()
    soil_types = models.JSONField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_model_results"


class EnvironmentalData(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wind_location = models.ForeignKey(
        WindLocation, on_delete=models.CASCADE, related_name="env_points"
    )

    latitude = models.FloatField()
    longitude = models.FloatField()

    wind_speed = models.FloatField()
    wind_direction = models.FloatField()
    elevation = models.FloatField()
    slope = models.FloatField(null=True, blank=True)

    soil_type = models.CharField(max_length=100)

    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "environmental_data"
        indexes = [
            models.Index(fields=["wind_location", "latitude", "longitude"]),
        ]
