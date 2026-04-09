"""
voltai_backend/optimization/optimizer.py

ИСПРАВЛЕНИЕ: default grid_size=5 (было 20)
"""

from typing import List, Dict, Tuple
import numpy as np


class BruteForceOptimizer:
    """
    Жадный brute-force с ограничением по минимальной дистанции между турбинами.
    Сортирует все точки по убыванию efficiency, берёт лучшие N с учётом расстояния.
    """

    def __init__(self, min_distance_km: float = 0.5):
        self.min_distance_km  = min_distance_km
        self.EARTH_RADIUS_KM  = 6371.0

    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
        return self.EARTH_RADIUS_KM * 2 * np.arcsin(np.sqrt(a))

    def is_valid_placement(
        self,
        new_point: Tuple[float, float],
        existing: List[Tuple[float, float]],
    ) -> bool:
        for lat, lon in existing:
            if self.haversine_distance(new_point[0], new_point[1], lat, lon) < self.min_distance_km:
                return False
        return True

    def optimize_positions(
        self,
        efficiency_map: np.ndarray,
        area_data: List[Dict],
        num_turbines: int,
        grid_size: int = 5,   # <── было 20, исправлено на 5
    ) -> List[Dict]:
        """
        Возвращает список лучших позиций для num_turbines турбин.

        Args:
            efficiency_map: массив (grid_size, grid_size) с эффективностями 0..1
            area_data:      список словарей с 'latitude', 'longitude', 'wind_speed'
            num_turbines:   сколько турбин разместить
            grid_size:      размер сетки (должен совпадать с моделью — 5)
        """
        candidates: List[Dict] = []

        for i in range(grid_size):
            for j in range(grid_size):
                idx = i * grid_size + j
                if idx >= len(area_data):
                    continue
                point = area_data[idx]
                candidates.append({
                    'row':        i,
                    'col':        j,
                    'lat':        point['latitude'],
                    'lon':        point['longitude'],
                    'efficiency': float(efficiency_map[i, j]),
                    'wind_speed': point['wind_speed'],
                })

        # Сортировка по эффективности (лучшие первыми)
        candidates.sort(key=lambda x: x['efficiency'], reverse=True)

        selected: List[Dict] = []
        selected_coords: List[Tuple[float, float]] = []

        for pos in candidates:
            if len(selected) >= num_turbines:
                break
            coord = (pos['lat'], pos['lon'])
            if self.is_valid_placement(coord, selected_coords):
                selected.append(pos)
                selected_coords.append(coord)

        return selected
