from typing import Dict, List
import numpy as np


class EnergyPredictor:
    def __init__(
        self,
        turbine_capacity_kw: float = 2000.0,
        rotor_diameter_m: float = 90.0,
        hub_height_m: float = 80.0,
    ):
        self.rated_capacity = turbine_capacity_kw
        self.rotor_diameter = rotor_diameter_m
        self.hub_height = hub_height_m
        self.power_coefficient = 0.40
        self.air_density = 1.225

    def calculate_swept_area(self) -> float:
        radius = self.rotor_diameter / 2.0
        return float(np.pi * radius**2)

    def adjust_wind_speed_for_height(
        self, wind_speed_10m: float, roughness_length: float = 0.1
    ) -> float:
        v_hub = wind_speed_10m * (
            np.log(self.hub_height / roughness_length)
            / np.log(10.0 / roughness_length)
        )
        return float(v_hub)

    def calculate_air_density(
        self, temperature_c: float, pressure_hpa: float, elevation_m: float
    ) -> float:
        pressure_pa = pressure_hpa * 100.0
        pressure_adjusted = pressure_pa * np.exp(-elevation_m / 8400.0)
        temp_k = temperature_c + 273.15
        R = 287.05
        density = pressure_adjusted / (R * temp_k)
        return float(density)

    def calculate_power_output(self, wind_speed: float, air_density: float) -> float:
        A = self.calculate_swept_area()
        power_w = 0.5 * air_density * A * (wind_speed**3) * self.power_coefficient
        power_kw = power_w / 1000.0
        power_kw = min(power_kw, self.rated_capacity)

        if wind_speed < 3.0 or wind_speed > 25.0:
            power_kw = 0.0

        return float(power_kw)

    def predict_energy_production(self, turbine_data: Dict) -> Dict:
        v_hub = self.adjust_wind_speed_for_height(turbine_data["wind_speed"])
        air_density = self.calculate_air_density(
            turbine_data["temperature"],
            turbine_data["pressure"],
            turbine_data["elevation"],
        )
        avg_power_kw = self.calculate_power_output(v_hub, air_density)
        avg_power_kw *= turbine_data["efficiency"]

        hours_per_month = 730.0

        result = {
            "1_month": avg_power_kw * hours_per_month * 1.0,
            "3_months": avg_power_kw * hours_per_month * 3.0,
            "6_months": avg_power_kw * hours_per_month * 6.0,
            "12_months": avg_power_kw * hours_per_month * 12.0,
            "avg_power_kw": avg_power_kw,
        }
        return result

    def predict_total_energy(self, optimal_positions: List[Dict]) -> Dict:
        total = {
            "1_month": 0.0,
            "3_months": 0.0,
            "6_months": 0.0,
            "12_months": 0.0,
        }
        turbines_out = []

        for pos in optimal_positions:
            turbine_data = {
                "wind_speed": pos["wind_speed"],
                "temperature": pos.get("temperature", 15.0),
                "pressure": pos.get("pressure", 1013.0),
                "elevation": pos.get("elevation", 0.0),
                "efficiency": pos["efficiency"],
            }
            pred = self.predict_energy_production(turbine_data)

            for k in total:
                total[k] += pred[k]

            turbines_out.append(
                {
                    "latitude": pos["lat"],
                    "longitude": pos["lon"],
                    "efficiency": pos["efficiency"],
                    "energy_predictions": pred,
                }
            )

        return {
            "total_energy": total,
            "turbines": turbines_out,
        }
