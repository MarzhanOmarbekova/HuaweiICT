import requests
import numpy as np
from typing import Dict, List


class EnvironmentalDataCollector:
    """
    Упрощённый сбор данных:
    - только ветер (скорость + направление) с Open-Meteo
    """

    def __init__(self):
        self.open_meteo_weather_url = "https://api.open-meteo.com/v1/forecast"

    def get_wind_data(self, lat: float, lon: float) -> Dict:
        """
        Средние за 30 дней:
        - wind_speed_10m (м/с)
        - wind_direction_10m (градусы)
        """
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "wind_speed_10m,wind_direction_10m",
            "wind_speed_unit": "ms",
            "past_days": 30,
            "timezone": "UTC",
        }

        try:
            resp = requests.get(self.open_meteo_weather_url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            hourly = data.get("hourly", {})

            wind_speed = np.mean(hourly.get("wind_speed_10m", [0.0]))
            wind_dir = np.mean(hourly.get("wind_direction_10m", [0.0]))

            return {
                "wind_speed": float(wind_speed),
                "wind_direction": float(wind_dir),
            }
        except Exception as e:
            print(f"[get_wind_data] error for ({lat}, {lon}): {e}")
            return {
                "wind_speed": 0.0,
                "wind_direction": 0.0,
            }

    def collect_area_data(
        self,
        lat_min: float,
        lat_max: float,
        lon_min: float,
        lon_max: float,
        grid_points: int = 8,
    ) -> List[Dict]:
        """
        Собираем данные по сетке grid_points × grid_points.
        Сейчас только ветер.
        """
        lat_range = np.linspace(lat_min, lat_max, grid_points)
        lon_range = np.linspace(lon_min, lon_max, grid_points)

        area_data: List[Dict] = []

        for lat in lat_range:
            for lon in lon_range:
                wind = self.get_wind_data(lat, lon)

                point = {
                    "latitude": float(lat),
                    "longitude": float(lon),
                    "wind_speed": wind["wind_speed"],
                    "wind_direction": wind["wind_direction"],
                }
                area_data.append(point)

        return area_data
