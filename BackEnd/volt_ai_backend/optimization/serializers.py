# optimization/serializers.py

from rest_framework import serializers

class PointSerializer(serializers.Serializer):
    lat = serializers.FloatField(help_text="Широта точки")
    long = serializers.FloatField(help_text="Долгота точки")

class OptimizationRequestSerializer(serializers.Serializer):
    """
    Сериализатор для валидации входного JSON-запроса с фронтенда.
    """
    area_polygon = serializers.ListField(
        child=PointSerializer(),
        min_length=3,
        help_text="Список координат, ограничивающих область анализа."
    )
    num_stations = serializers.IntegerField(min_value=1, help_text="Желаемое количество станций.")
    # Эти поля опциональны, но могут быть в запросе
    save_results = serializers.BooleanField(required=False, default=False)
    task_name = serializers.CharField(max_length=100, required=False)