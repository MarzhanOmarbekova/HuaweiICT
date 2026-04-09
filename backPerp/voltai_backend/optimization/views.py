"""
voltai_backend/optimization/views.py

ИСПРАВЛЕНИЯ:
1. grid_size = 5 везде (модель обучена на 5x5, не 8x8)
2. WindTurbineCNN(grid_size=5) при загрузке
3. Используется wind_cnn_final.ckpt (wind_cnn_best.ckpt — это пустая заглушка!)
4. Исправлен расчёт энергии: добавлен множитель от ветра
5. Optimizer вызывается с grid_size=5
"""

import os
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


# ────────────────────────────────────────────────────────────
# Конфигурация: ModelArts (опционально) и путь к чекпоинту
# ────────────────────────────────────────────────────────────
MODELARTS_ENDPOINT = os.environ.get('MODELARTS_ENDPOINT', '')
MODELARTS_TOKEN    = os.environ.get('MODELARTS_TOKEN', '')

# ВАЖНО: используем wind_cnn_final.ckpt — это реальная обученная модель.
# wind_cnn_best.ckpt в репозитории — пустой текстовый файл-заглушка!
_OPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_CKPT_PATH = os.environ.get(
    'MINDSPORE_CHECKPOINT',
    os.path.join(_OPT_DIR, 'wind_cnn_final.ckpt')   # <── изменено
)

# Размер сетки должен совпадать с тем, на чём обучали (5x5)
GRID_SIZE = 5  # <── было 8, исправлено на 5


# ────────────────────────────────────────────────────────────
# Загрузка модели (singleton)
# ────────────────────────────────────────────────────────────

def _load_model():
    """Загружает CNN с правильной архитектурой (grid_size=5)."""
    model = WindTurbineCNN(input_channels=2, grid_size=GRID_SIZE)  # grid_size=5!

    if os.path.exists(LOCAL_CKPT_PATH):
        # Проверяем, что файл не пустая заглушка (реальный .ckpt > 1 KB)
        file_size = os.path.getsize(LOCAL_CKPT_PATH)
        if file_size < 1024:
            print(f'[CNN] WARNING: Checkpoint {LOCAL_CKPT_PATH} подозрительно мал ({file_size} байт).')
            print('[CNN] Убедись, что это wind_cnn_final.ckpt, а не wind_cnn_best.ckpt!')
        try:
            param_not_loaded, _ = mindspore.load_param_into_net(
                model, mindspore.load_checkpoint(LOCAL_CKPT_PATH)
            )
            if param_not_loaded:
                print(f'[CNN] Не загружены параметры: {param_not_loaded}')
            else:
                print(f'[CNN] Веса загружены успешно: {LOCAL_CKPT_PATH} ({file_size/1024:.1f} KB)')
        except Exception as e:
            print(f'[CNN] Ошибка загрузки чекпоинта: {e}')
            print('[CNN] Используются случайные веса — результаты будут неточными!')
    else:
        print(f'[CNN] Файл не найден: {LOCAL_CKPT_PATH}')
        print('[CNN] Скопируй wind_cnn_final.ckpt в папку optimization/')
        print('[CNN] Или укажи путь через env: MINDSPORE_CHECKPOINT=/path/to/wind_cnn_final.ckpt')

    model.set_train(False)
    return model


_cnn_model = None


def get_cnn_model():
    global _cnn_model
    if _cnn_model is None:
        _cnn_model = _load_model()
    return _cnn_model


# ────────────────────────────────────────────────────────────
# Инференс
# ────────────────────────────────────────────────────────────

def run_cnn_inference(area_data: list, grid_size: int = GRID_SIZE) -> np.ndarray:
    """
    Запускает инференс — возвращает efficiency_map (grid_size, grid_size) float 0..1.

    Приоритет:
      1. ModelArts endpoint (если задан в env)
      2. Локальная модель MindSpore
    """
    # --- ModelArts ---
    if MODELARTS_ENDPOINT and MODELARTS_TOKEN:
        try:
            ws_map  = np.zeros((grid_size, grid_size), dtype=np.float32)
            wd_map  = np.zeros((grid_size, grid_size), dtype=np.float32)
            for idx, point in enumerate(area_data):
                r, c = idx // grid_size, idx % grid_size
                if r < grid_size and c < grid_size:
                    ws_map[r, c] = point['wind_speed']
                    wd_map[r, c] = point['wind_direction']

            resp = http_requests.post(
                MODELARTS_ENDPOINT,
                json={'instances': [{'wind_speed': ws_map.tolist(), 'wind_direction': wd_map.tolist()}]},
                headers={'Content-Type': 'application/json', 'X-Auth-Token': MODELARTS_TOKEN},
                timeout=30,
            )
            resp.raise_for_status()
            efficiency_map = np.array(resp.json()['efficiency_map'], dtype=np.float32)
            print('[CNN] Использован ModelArts endpoint')
            return efficiency_map
        except Exception as e:
            print(f'[CNN] ModelArts недоступен: {e}, fallback на локальную модель')

    # --- Локальная модель ---
    model = get_cnn_model()
    input_array  = prepare_input_data(area_data, grid_size=grid_size)
    input_tensor = Tensor(input_array, mindspore.float32)
    efficiency_map = model(input_tensor).asnumpy()[0]   # (grid_size, grid_size)
    return efficiency_map


# ────────────────────────────────────────────────────────────
# Views
# ────────────────────────────────────────────────────────────

class WindOptimizationView(APIView):
    permission_classes = [IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.data_collector = EnvironmentalDataCollector()
        self.optimizer = BruteForceOptimizer(min_distance_km=0.5)

    def post(self, request):
        serializer = WindOptimizationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        coords       = serializer.validated_data['coordinates']
        num_turbines = serializer.validated_data['num_turbines']
        grid_size    = GRID_SIZE  # 5x5 — как при обучении

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

                # 1) Сбор данных о ветре (Open-Meteo API)
                area_data = self.data_collector.collect_area_data(
                    lat_min=coords['lat_min'],
                    lat_max=coords['lat_max'],
                    lon_min=coords['lon_min'],
                    lon_max=coords['lon_max'],
                    grid_points=grid_size,   # 5x5 = 25 точек
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

                # 2) CNN инференс → карта эффективности (5x5)
                efficiency_map = run_cnn_inference(area_data, grid_size=grid_size)

                # 3) Выбор лучших позиций
                optimal_positions = self.optimizer.optimize_positions(
                    efficiency_map=efficiency_map,
                    area_data=area_data,
                    num_turbines=num_turbines,
                    grid_size=grid_size,   # 5, не 20 и не 8
                )

                # 4) Расчёт энергии по физической формуле
                # P = 0.5 * rho * A * V_hub³ * Cp * efficiency
                hours_per_month = 730.0
                rotor_radius    = 45.0                        # м, типовая 2МВт турбина
                swept_area      = np.pi * rotor_radius ** 2  # ~6362 м²
                air_density     = 1.225                       # кг/м³
                Cp              = 0.40                        # коэф. мощности
                rated_kw        = 2000.0                      # номинальная мощность

                total_1 = total_3 = total_6 = total_12 = 0.0
                turbine_details = []

                for pos in optimal_positions:
                    v   = max(pos['wind_speed'], 0.0)
                    eff = float(pos['efficiency'])

                    # Пересчёт скорости с 10м на высоту ступицы 80м (логарифмический профиль)
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
                        'latitude':   pos['lat'],
                        'longitude':  pos['lon'],
                        'efficiency': round(eff, 4),
                        'wind_speed': round(v, 2),
                        'wind_speed_hub': round(v_hub, 2),
                        'energy_predictions': {
                            '1_month':     round(e1,  2),
                            '3_months':    round(e3,  2),
                            '6_months':    round(e6,  2),
                            '12_months':   round(e12, 2),
                            'avg_power_kw': round(avg_power_kw, 2),
                        },
                    })

                optimal_points = [
                    {'lat': t['latitude'], 'lon': t['longitude'], 'efficiency': t['efficiency']}
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
                        'soil_types':     ai_result.soil_types,
                    },
                    'turbine_details': turbine_details,
                    'grid_size': grid_size,
                    'inference_mode': 'modelarts' if (MODELARTS_ENDPOINT and MODELARTS_TOKEN) else 'local',
                }, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            traceback.print_exc()
            wind_location.status = 'failed'
            wind_location.save()
            return Response(
                {'error': f'Optimization failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class OptimizationHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        locations = WindLocation.objects.filter(user=request.user).order_by('-created_at')
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
                # Собираем все предсказания энергии
                item['energy_1_month'] = f'{res.energy_1_month:.2f} kWh'
                item['energy_3_months'] = f'{res.energy_3_months:.2f} kWh'
                item['energy_6_months'] = f'{res.energy_6_months:.2f} kWh'
                item['energy_12_months'] = f'{res.energy_12_months:.2f} kWh'

                # Собираем данные об окружающей среде
                item['avg_wind_speed'] = f'{res.avg_wind_speed:.2f} m/s'
                item['avg_elevation'] = f'{res.avg_elevation:.1f} m'

                # Передаем точки (убедись, что в JSON точек лежат wind_speed и т.д.)
                item['optimal_points'] = res.optimal_points

            except AIModelResult.DoesNotExist:
                item['energy_12_months'] = '-'
                item['optimal_points'] = []

            history.append(item)

        return Response({'history': history}, status=status.HTTP_200_OK)