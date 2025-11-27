from typing import List, Dict, Tuple
import numpy as np


class BruteForceOptimizer:
    """
    Жадный brute-force с ограничением по минимальной дистанции.
    """

    def __init__(self, min_distance_km: float = 0.5):
        self.min_distance_km = min_distance_km
        self.EARTH_RADIUS_KM = 6371.0

    def haversine_distance(
        self, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
        c = 2 * np.arcsin(np.sqrt(a))
        return self.EARTH_RADIUS_KM * c

    def is_valid_placement(
        self, new_point: Tuple[float, float], existing_points: List[Tuple[float, float]]
    ) -> bool:
        new_lat, new_lon = new_point
        for lat, lon in existing_points:
            if self.haversine_distance(new_lat, new_lon, lat, lon) < self.min_distance_km:
                return False
        return True

    def optimize_positions(
        self,
        efficiency_map: np.ndarray,
        area_data: List[Dict],
        num_turbines: int,
        grid_size: int = 20,
    ) -> List[Dict]:
        positions: List[Dict] = []

        for i in range(grid_size):
            for j in range(grid_size):
                idx = i * grid_size + j
                if idx >= len(area_data):
                    continue
                point = area_data[idx]
                positions.append(
                    {
                        "row": i,
                        "col": j,
                        "lat": point["latitude"],
                        "lon": point["longitude"],
                        "efficiency": float(efficiency_map[i, j]),
                        "wind_speed": point["wind_speed"],
                    }
                )

        positions.sort(key=lambda x: x["efficiency"], reverse=True)

        selected = []
        selected_coords: List[Tuple[float, float]] = []

        for pos in positions:
            if len(selected) >= num_turbines:
                break
            coord = (pos["lat"], pos["lon"])
            if self.is_valid_placement(coord, selected_coords):
                selected.append(pos)
                selected_coords.append(coord)

        return selected
