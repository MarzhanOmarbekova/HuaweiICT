from django.shortcuts import render

# Create your views here.
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

import numpy as np
import mindspore
from mindspore import Tensor

from .models import WindLocation, AIModelResult, EnvironmentalData
from .serializers import WindOptimizationSerializer
from .data_collector import EnvironmentalDataCollector
from .energy_calculator import EnergyPredictor

from .cnn_model import WindTurbineCNN, prepare_input_data
from .optimizer import BruteForceOptimizer


class WindOptimizationView(APIView):
    permission_classes = [IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.data_collector = EnvironmentalDataCollector()
        self.optimizer = BruteForceOptimizer(min_distance_km=0.5)
        # grid_size = 8, input_channels = 2
        self.cnn_model = WindTurbineCNN(input_channels=2, grid_size=8)

    def post(self, request):
        serializer = WindOptimizationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        coords = serializer.validated_data["coordinates"]
        num_turbines = serializer.validated_data["num_turbines"]

        try:
            with transaction.atomic():
                wind_location = WindLocation.objects.create(
                    user=request.user,
                    lat_min=coords["lat_min"],
                    lat_max=coords["lat_max"],
                    lon_min=coords["lon_min"],
                    lon_max=coords["lon_max"],
                    num_turbines=num_turbines,
                    status="processing",
                )

                # 1) Собираем только ветер по сетке 8x8
                grid_size = 8
                area_data = self.data_collector.collect_area_data(
                    lat_min=coords["lat_min"],
                    lat_max=coords["lat_max"],
                    lon_min=coords["lon_min"],
                    lon_max=coords["lon_max"],
                    grid_points=grid_size,
                )

                # Сохраняем в БД (env таблица)
                for point in area_data:
                    EnvironmentalData.objects.create(
                        wind_location=wind_location,
                        latitude=point["latitude"],
                        longitude=point["longitude"],
                        wind_speed=point["wind_speed"],
                        wind_direction=point["wind_direction"],
                        elevation=0.0,
                        soil_type="Unknown",
                    )

                # 2) Готовим вход для CNN (2 канала)
                input_array = prepare_input_data(area_data, grid_size=grid_size)
                input_tensor = Tensor(input_array, mindspore.float32)

                # 3) Прогон через CNN → карта эффективности
                self.cnn_model.set_train(False)
                efficiency_map = self.cnn_model(input_tensor).asnumpy()[0]

                # 4) Brute-force размещение
                optimal_positions = self.optimizer.optimize_positions(
                    efficiency_map=efficiency_map,
                    area_data=area_data,
                    num_turbines=num_turbines,
                    grid_size=grid_size,
                )

                # 5) Грубый расчёт энергии (только по скорости и эффективности)
                #    Пусть считаем, что мощность ~ wind_speed^3 * efficiency,
                #    потом переводим в kWh за периоды.
                hours_per_month = 730.0
                total_1 = 0.0
                total_3 = 0.0
                total_6 = 0.0
                total_12 = 0.0

                turbine_details = []
                for pos in optimal_positions:
                    v = max(pos["wind_speed"], 0.0)
                    eff = pos["efficiency"]
                    # Нормируем мощность: просто V^3 * eff / 100 для демо
                    avg_power_kw = (v**3) * eff / 100.0

                    e1 = avg_power_kw * hours_per_month * 1.0
                    e3 = avg_power_kw * hours_per_month * 3.0
                    e6 = avg_power_kw * hours_per_month * 6.0
                    e12 = avg_power_kw * hours_per_month * 12.0

                    total_1 += e1
                    total_3 += e3
                    total_6 += e6
                    total_12 += e12

                    turbine_details.append(
                        {
                            "latitude": pos["lat"],
                            "longitude": pos["lon"],
                            "efficiency": eff,
                            "wind_speed": pos["wind_speed"],
                            "energy_predictions": {
                                "1_month": e1,
                                "3_months": e3,
                                "6_months": e6,
                                "12_months": e12,
                                "avg_power_kw": avg_power_kw,
                            },
                        }
                    )

                optimal_points = [
                    {
                        "lat": t["latitude"],
                        "lon": t["longitude"],
                        "efficiency": float(t["efficiency"]),
                    }
                    for t in turbine_details
                ]

                ai_result = AIModelResult.objects.create(
                    wind_location=wind_location,
                    optimal_points=optimal_points,
                    energy_1_month=total_1,
                    energy_3_months=total_3,
                    energy_6_months=total_6,
                    energy_12_months=total_12,
                    avg_wind_speed=float(
                        np.mean([p["wind_speed"] for p in area_data])
                    ),
                    avg_elevation=0.0,
                    soil_types=["Unknown"],
                )

                wind_location.status = "completed"
                wind_location.save()

                resp = {
                    "location_id": str(wind_location.id),
                    "optimal_points": optimal_points,
                    "predicted_energy": {
                        "1_month": f"{ai_result.energy_1_month:.2f} kWh",
                        "3_months": f"{ai_result.energy_3_months:.2f} kWh",
                        "6_months": f"{ai_result.energy_6_months:.2f} kWh",
                        "12_months": f"{ai_result.energy_12_months:.2f} kWh",
                    },
                    "environmental_summary": {
                        "avg_wind_speed": f"{ai_result.avg_wind_speed:.2f} m/s",
                        "avg_elevation": f"{ai_result.avg_elevation:.2f} m",
                        "soil_types": ai_result.soil_types,
                    },
                    "turbine_details": turbine_details,
                }

                return Response(resp, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Optimization failed: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class OptimizationHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        locations = (
            WindLocation.objects.filter(user=request.user)
            .order_by("-created_at")
            .select_related()
        )

        history = []
        for loc in locations:
            item = {
                "id": str(loc.id),
                "created_at": loc.created_at,
                "num_turbines": loc.num_turbines,
                "status": loc.status,
            }
            try:
                res = AIModelResult.objects.get(wind_location=loc)
                item["energy_12_months"] = f"{res.energy_12_months:.2f} kWh"
                item["optimal_points"] = res.optimal_points
            except AIModelResult.DoesNotExist:
                pass
            history.append(item)

        return Response({"history": history}, status=status.HTTP_200_OK)
