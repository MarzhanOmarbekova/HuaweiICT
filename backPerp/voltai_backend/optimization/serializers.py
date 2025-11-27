from rest_framework import serializers


class WindOptimizationSerializer(serializers.Serializer):
    coordinates = serializers.DictField(child=serializers.FloatField())
    num_turbines = serializers.IntegerField(min_value=1, max_value=100)

    def validate_coordinates(self, value):
        required_keys = ["lat_min", "lat_max", "lon_min", "lon_max"]
        if not all(k in value for k in required_keys):
            raise serializers.ValidationError(
                f"Coordinates must contain: {', '.join(required_keys)}"
            )

        if value["lat_min"] >= value["lat_max"]:
            raise serializers.ValidationError("lat_min must be less than lat_max")

        if value["lon_min"] >= value["lon_max"]:
            raise serializers.ValidationError("lon_min must be less than lon_max")

        return value
