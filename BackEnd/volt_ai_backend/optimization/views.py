# optimization/views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
# Импортируем наш новый ML-сервис
from .ml_module.wind_calculator import calculate_optimal_points
from .serializers import OptimizationRequestSerializer


@api_view(['POST'])
def optimize_wind_sync_view(request):
    """
    API для обработки запроса от фронтенда и синхронного вызова ML-модуля.
    """
    serializer = OptimizationRequestSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        # ПРЯМОЙ ВЫЗОВ СИНХРОНИЗИРОВАННОГО ML-МОДУЛЯ (MindSpore)
        results = calculate_optimal_points(
            area_polygon=data['area_polygon'],
            num_stations=data['num_stations']
        )

        # Возвращаем результат в формате, который ожидает фронтенд
        return Response(results, status=status.HTTP_200_OK)

    except Exception as e:
        # В случае ошибки (например, с MindSpore)
        return Response({"error": f"Ошибка вычисления ML-модуля: {str(e)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)