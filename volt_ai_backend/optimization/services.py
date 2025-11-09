# optimization/services.py (ИСПОЛЬЗУЙТЕ ЭТОТ КОД)
import requests
import os
import random

# === НАСТРОЙКИ AI-СЕРВИСА HUAWEI ===
MODEL_ARTS_API_URL = os.environ.get("MODEL_ARTS_API_URL", "https_.../predict")
MODEL_ARTS_API_KEY = os.environ.get("MODEL_ARTS_API_KEY", "your_secret_key")


def find_optimal_wind_points_huawei(area_polygon, num_stations):
    """
    РЕАЛЬНАЯ функция: обращается к развернутой
    AI-модели на Huawei Cloud ModelArts.
    """
    # ... Код, делающий requests.post к ModelArts (как вы предоставили) ...
    # Пока что, она вызовет ошибку, так как URL фейковый.
    # Это правильно для заглушки.

    # Чтобы не ломать заглушку, временно вернем mock-данные (для тестирования)
    return _generate_mock_results(area_polygon, num_stations)


def _generate_mock_results(area_polygon, num_stations):
    """
    ФУНКЦИЯ-ЗАГЛУШКА. Используйте ее, пока AI-модель не готова.
    """
    # Найдем "центр" полигона (очень грубо)
    avg_lat = sum(p['lat'] for p in area_polygon) / len(area_polygon)
    avg_long = sum(p['long'] for p in area_polygon) / len(area_polygon)

    points = []
    base_kwh = 3000 * num_stations  # База 3000 кВтч на станцию в месяц

    for _ in range(num_stations):
        points.append({
            "lat": round(avg_lat + random.uniform(-0.01, 0.01), 5),
            "long": round(avg_long + random.uniform(-0.01, 0.01), 5),
            "efficiency": round(random.uniform(0.75, 0.95), 2)
        })

    # Возвращаем числа (integer), а не строки с 'kWh' для удобства фронтенда/базы
    return {
        "optimal_points": points,
        "predicted_energy": {
            "1_month": int(base_kwh * random.uniform(0.9, 1.1)),
            "3_months": int(base_kwh * 3 * random.uniform(0.9, 1.1)),
            "6_months": int(base_kwh * 6 * random.uniform(0.9, 1.1)),
            "12_months": int(base_kwh * 12 * random.uniform(0.9, 1.1))
        }
    }


def start_wind_optimization_task(area_polygon, num_stations):
    """
    Главная сервисная функция, которую вызывает View.
    """
    # ВРЕМЕННО СТАВИМ ТУТ True, чтобы работал Mock,
    # пока нет реального сервиса Huawei.
    USE_MOCK_DATA = True

    if USE_MOCK_DATA:
        results = _generate_mock_results(area_polygon, num_stations)
    else:
        results = find_optimal_wind_points_huawei(area_polygon, num_stations)

    return results