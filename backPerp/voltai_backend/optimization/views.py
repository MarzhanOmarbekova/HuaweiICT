"""
UPDATED voltai_backend/optimization/views.py
Changes:
1. Loads pretrained .ckpt from local path or OBS on startup
2. Optionally calls ModelArts Online Inference endpoint instead of local CNN
3. Fixes grid_size mismatch in optimizer (was 20, now 8)
"""

import os
import io
import json
import requests as http_requests

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
from .cnn_model import WindTurbineCNN, prepare_input_data
from .optimizer import BruteForceOptimizer


# ============================================================
# ModelArts endpoint (set in env vars or Django settings)
# Leave empty to use local CNN
# ============================================================
MODELARTS_ENDPOINT = os.environ.get('MODELARTS_ENDPOINT', '')
MODELARTS_TOKEN    = os.environ.get('MODELARTS_TOKEN', '')

# Local checkpoint path (downloaded from OBS on deploy)
# On server: python manage.py download_model  (add management command below)
LOCAL_CKPT_PATH = os.environ.get(
    'MINDSPORE_CHECKPOINT',
    os.path.join(os.path.dirname(os.path.abspath(__file__)), 'wind_cnn_best.ckpt')
)


def _load_model():
    """Load CNN model once at module level."""
    model = WindTurbineCNN(input_channels=2, grid_size=8)
    if os.path.exists(LOCAL_CKPT_PATH):
        try:
            mindspore.load_checkpoint(LOCAL_CKPT_PATH, net=model)
            print(f'[CNN] Loaded pretrained weights from: {LOCAL_CKPT_PATH}')
        except Exception as e:
            print(f'[CNN] Could not load checkpoint: {e} - using random weights')
    else:
        print(f'[CNN] No checkpoint found at {LOCAL_CKPT_PATH}')
        print('[CNN] Using untrained model (results will be random)')
        print('[CNN] Run: python manage.py download_model  to fetch from OBS')
    model.set_train(False)
    return model


# Module-level singleton - loaded once when Django starts
_cnn_model = None


def get_cnn_model():
    global _cnn_model
    if _cnn_model is None:
        _cnn_model = _load_model()
    return _cnn_model


def run_cnn_inference(area_data: list, grid_size: int = 8) -> np.ndarray:
    """
    Run efficiency inference. Uses ModelArts endpoint if configured,
    otherwise uses local CNN model.
    Returns: efficiency_map (grid_size, grid_size) array of floats 0..1
    """
    # --- Option A: ModelArts Online Inference ---
    if MODELARTS_ENDPOINT and MODELARTS_TOKEN:
        try:
            wind_speed_map = np.zeros((grid_size, grid_size), dtype=np.float32)
            wind_dir_map   = np.zeros((grid_size, grid_size), dtype=np.float32)

            for idx, point in enumerate(area_data):
                row = idx // grid_size
                col = idx % grid_size
                if row < grid_size and col < grid_size:
                    wind_speed_map[row, col] = point['wind_speed']
                    wind_dir_map[row, col]   = point['wind_direction']

            payload = {
                'instances': [{
                    'wind_speed':     wind_speed_map.tolist(),
                    'wind_direction': wind_dir_map.tolist(),
                }]
            }
            headers = {
                'Content-Type': 'application/json',
                'X-Auth-Token': MODELARTS_TOKEN,
            }
            resp = http_requests.post(
                MODELARTS_ENDPOINT,
                json=payload,
                headers=headers,
                timeout=30
            )
            resp.raise_for_status()
            result = resp.json()
            efficiency_map = np.array(result['efficiency_map'], dtype=np.float32)
            print('[CNN] Used ModelArts endpoint for inference')
            return efficiency_map

        except Exception as e:
            print(f'[CNN] ModelArts call failed: {e}, falling back to local model')

    # --- Option B: Local MindSpore model ---
    model = get_cnn_model()
    input_array = prepare_input_data(area_data, grid_size=grid_size)
    input_tensor = Tensor(input_array, mindspore.float32)
    efficiency_map = model(input_tensor).asnumpy()[0]  # (8, 8)
    return efficiency_map


class WindOptimizationView(APIView):
    permission_classes = [IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.data_collector = EnvironmentalDataCollector()
        # FIXED: min_distance_km set to 0.5, grid_size=8 (not 20!)
        self.optimizer = BruteForceOptimizer(min_distance_km=0.5)

    def post(self, request):
        serializer = WindOptimizationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        coords       = serializer.validated_data['coordinates']
        num_turbines = serializer.validated_data['num_turbines']
        grid_size    = 8

        try:
            with transaction.atomic():
                wind_location = WindLocation.objects.create(
                    user=request.user,
                    lat_min=coords['lat_min'],
                    lat_max=coords['lat_max'],
                    lon_min=coords['lon_min'],
                    lon_max=coords['lon_max'],
                    num_turbines=num_turbines,
                    status='processing',
                )

                # 1) Collect wind data (real API calls to Open-Meteo)
                area_data = self.data_collector.collect_area_data(
                    lat_min=coords['lat_min'],
                    lat_max=coords['lat_max'],
                    lon_min=coords['lon_min'],
                    lon_max=coords['lon_max'],
                    grid_points=grid_size,
                )

                for point in area_data:
                    EnvironmentalData.objects.create(
                        wind_location=wind_location,
                        latitude=point['latitude'],
                        longitude=point['longitude'],
                        wind_speed=point['wind_speed'],
                        wind_direction=point['wind_direction'],
                        elevation=0.0,
                        soil_type='Unknown',
                    )

                # 2) Run CNN inference (local or ModelArts)
                efficiency_map = run_cnn_inference(area_data, grid_size=grid_size)

                # 3) Brute-force placement
                # FIXED: pass grid_size=8 (must match actual data grid)
                optimal_positions = self.optimizer.optimize_positions(
                    efficiency_map=efficiency_map,
                    area_data=area_data,
                    num_turbines=num_turbines,
                    grid_size=grid_size,  # <--- WAS 20 IN ORIGINAL, CAUSES BUG
                )

                # 4) Energy calculation
                hours_per_month = 730.0
                total_1 = total_3 = total_6 = total_12 = 0.0
                turbine_details = []

                for pos in optimal_positions:
                    v   = max(pos['wind_speed'], 0.0)
                    eff = pos['efficiency']

                    # Realistic power estimate using wind power formula:
                    # P = 0.5 * rho * A * V^3 * Cp * efficiency
                    # Using 2MW turbine: rotor_radius=45m, Cp=0.4, rho=1.225
                    rotor_radius = 45.0
                    swept_area   = 3.14159 * rotor_radius ** 2  # ~6362 m2
                    air_density  = 1.225
                    Cp           = 0.40
                    rated_kw     = 2000.0

                    # Adjust wind to hub height (80m) from 10m measurement
                    v_hub = v * (np.log(80.0 / 0.1) / np.log(10.0 / 0.1))

                    if 3.0 <= v_hub <= 25.0:
                        avg_power_kw = min(
                            rated_kw,
                            0.5 * air_density * swept_area * (v_hub ** 3) * Cp * eff / 1000.0
                        )
                    else:
                        avg_power_kw = 0.0

                    e1  = avg_power_kw * hours_per_month
                    e3  = e1 * 3
                    e6  = e1 * 6
                    e12 = e1 * 12

                    total_1  += e1
                    total_3  += e3
                    total_6  += e6
                    total_12 += e12

                    turbine_details.append({
                        'latitude':  pos['lat'],
                        'longitude': pos['lon'],
                        'efficiency': eff,
                        'wind_speed': v,
                        'energy_predictions': {
                            '1_month':  round(e1,  2),
                            '3_months': round(e3,  2),
                            '6_months': round(e6,  2),
                            '12_months': round(e12, 2),
                            'avg_power_kw': round(avg_power_kw, 2),
                        },
                    })

                optimal_points = [
                    {'lat': t['latitude'], 'lon': t['longitude'], 'efficiency': round(t['efficiency'], 4)}
                    for t in turbine_details
                ]

                ai_result = AIModelResult.objects.create(
                    wind_location=wind_location,
                    optimal_points=optimal_points,
                    energy_1_month=total_1,
                    energy_3_months=total_3,
                    energy_6_months=total_6,
                    energy_12_months=total_12,
                    avg_wind_speed=float(np.mean([p['wind_speed'] for p in area_data])),
                    avg_elevation=0.0,
                    soil_types=['Unknown'],
                )

                wind_location.status = 'completed'
                wind_location.save()

                return Response({
                    'location_id': str(wind_location.id),
                    'optimal_points': optimal_points,
                    'predicted_energy': {
                        '1_month':   f'{ai_result.energy_1_month:.2f} kWh',
                        '3_months':  f'{ai_result.energy_3_months:.2f} kWh',
                        '6_months':  f'{ai_result.energy_6_months:.2f} kWh',
                        '12_months': f'{ai_result.energy_12_months:.2f} kWh',
                    },
                    'environmental_summary': {
                        'avg_wind_speed': f'{ai_result.avg_wind_speed:.2f} m/s',
                        'avg_elevation':  f'{ai_result.avg_elevation:.2f} m',
                        'soil_types':      ai_result.soil_types,
                    },
                    'turbine_details': turbine_details,
                    'inference_mode': 'modelarts' if (MODELARTS_ENDPOINT and MODELARTS_TOKEN) else 'local',
                }, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Optimization failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class OptimizationHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        locations = (
            WindLocation.objects.filter(user=request.user)
            .order_by('-created_at')
        )
        history = []
        for loc in locations:
            item = {
                'id': str(loc.id),
                'created_at': loc.created_at,
                'num_turbines': loc.num_turbines,
                'status': loc.status,
            }
            try:
                res = AIModelResult.objects.get(wind_location=loc)
                item['energy_12_months'] = f'{res.energy_12_months:.2f} kWh'
                item['optimal_points']   = res.optimal_points
            except AIModelResult.DoesNotExist:
                pass
            history.append(item)

        return Response({'history': history}, status=status.HTTP_200_OK)
