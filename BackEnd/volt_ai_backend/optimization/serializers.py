# optimization/serializers.py
from rest_framework import serializers

class CoordinateSerializer(serializers.Serializer):
    lat = serializers.FloatField()
    long = serializers.FloatField()

class OptimizationRequestSerializer(serializers.Serializer):
    area_polygon = serializers.ListField(child=CoordinateSerializer()) 
    num_stations = serializers.IntegerField(min_value=1)
    task_name = serializers.CharField(max_length=255, required=False)
    save_results = serializers.BooleanField(required=False, default=False) # Новое поле!