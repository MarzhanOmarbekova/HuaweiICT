# ml_module/wind_calculator.py

import numpy as np
import random
from mindspore import Tensor, dtype as mstype
# Импортируем нашу модель
from .wind_cnn_model import WindEfficiencyCNN

# --- КОНСТАНТЫ И ИНИЦИАЛИЗАЦИЯ ---
NUM_CHANNELS = 5
HEIGHT, WIDTH = 100, 100

# Глобальная инициализация модели при запуске Django
# В реальном проекте здесь будет загрузка обученных весов: NET.load_checkpoint(...)
NET = WindEfficiencyCNN(num_input_channels=NUM_CHANNELS)


# --- ФУНКЦИЯ ПОИСКА K МАКСИМУМОВ ---
def find_k_max_points(efficiency_map_tensor, k, map_height, map_width, area_polygon):
    """
    Находит K точек с максимальной вероятностью в канале "Высокая эффективность" (индекс 2).
    """
    # 1. Выбираем канал "Высокая эффективность" (индекс 2)
    high_eff_map = efficiency_map_tensor[0, 2, :, :]

    # 2. Преобразование в 2D-массив NumPy и поиск K крупнейших индексов
    map_np = high_eff_map.asnumpy().squeeze()
    flat_map = map_np.flatten()
    k_indices_flat = np.argpartition(flat_map, -k)[-k:]

    optimal_points = []
    rows, cols = np.unravel_index(k_indices_flat, map_np.shape)

    # 3. Расчет географических координат (Имитация на основе bbox входного полигона)
    # Используем min/max из входного полигона для имитации границ карты
    lats = [p['lat'] for p in area_polygon]
    longs = [p['long'] for p in area_polygon]
    LAT_MIN, LAT_MAX = min(lats), max(lats)
    LONG_MIN, LONG_MAX = min(longs), max(longs)

    for r, c in zip(rows, cols):
        lat = LAT_MIN + (r / map_height) * (LAT_MAX - LAT_MIN)
        long = LONG_MIN + (c / map_width) * (LONG_MAX - LONG_MIN)

        optimal_points.append({
            "lat": round(float(lat), 5),
            "long": round(float(long), 5),
            "efficiency": round(float(map_np[r, c]), 5)
        })

    optimal_points.sort(key=lambda x: x['efficiency'], reverse=True)
    return optimal_points


# --- ГЛАВНАЯ ФУНКЦИЯ ДЛЯ DJANGO ---
def calculate_optimal_points(area_polygon, num_stations):
    """
    Вызывается Django View.
    """
    # 1. Имитация подготовки данных (Геоданные -> Tensor)
    dummy_input = Tensor(np.random.rand(1, NUM_CHANNELS, HEIGHT, WIDTH), mstype.float32)

    # 2. ИНФЕРЕНС: Прогон через синхронизированную модель MindSpore
    efficiency_map_tensor = NET(dummy_input)

    # 3. ПОИСК: Находим K лучших точек, используя входные координаты для геокодирования
    optimal_points = find_k_max_points(
        efficiency_map_tensor,
        num_stations,
        HEIGHT,
        WIDTH,
        area_polygon  # Передаем координаты с фронта для имитации
    )

    # 4. ПРОГНОЗ ЭНЕРГИИ (Заглушка)
    energy_forecast = {
        "1_month": f"{random.randint(2000, 4000)} kWh",
        "3_months": f"{random.randint(8000, 12000)} kWh",
        "6_months": f"{random.randint(16000, 24000)} kWh",
        "12_months": f"{random.randint(32000, 45000)} kWh"
    }

    return {"optimal_points": optimal_points, "predicted_energy": energy_forecast}