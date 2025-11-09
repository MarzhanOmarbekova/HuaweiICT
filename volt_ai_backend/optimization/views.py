# optimization/views.py (ИСПОЛЬЗУЙТЕ ЭТОТ КОД)
# ВЕСЬ ВАШ КОД, НО С ИЗМЕНЕНИЯМИ ДЛЯ WindOptimizationTask.objects.create:

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import start_wind_optimization_task
from .serializers import OptimizationRequestSerializer
from .models import AIModelResult, WindOptimizationTask  # Нужно создать эти модели


# ... import requests, os, random ...

class WindOptimizeView(APIView):
    # ...
    def post(self, request, *args, **kwargs):
        # ... (пропуск валидации)
        serializer = OptimizationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data

        # 1. Создаем "Задачу" в базе (ИСПРАВЛЕНИЕ: user=None, пока нет аутентификации)
        task = WindOptimizationTask.objects.create(
            user=None,  # <<< ИСПРАВЛЕНО
            name=validated_data.get('task_name', 'Untitled'),
            status='PENDING',
            input_data=validated_data
        )

        # ... (пропуск Celery/Task Queue)

        try:
            # 3. Вызываем наш "сервис"
            results = start_wind_optimization_task(
                area_polygon=validated_data['area_polygon'],
                num_stations=validated_data['num_stations']
            )

            # 4. Обновляем задачу в базе
            task.status = 'COMPLETED'
            task.result_data = results
            task.save()

            # 5. Сохраняем, если пользователь попросил (ИСПРАВЛЕНИЕ: user=None)
            if validated_data.get('save_results', False):
                AIModelResult.objects.create(
                    task=task,
                    user=None,  # <<< ИСПРАВЛЕНО
                    optimal_points=results['optimal_points'],
                    predicted_energy=results['predicted_energy']
                )

            # 6. Возвращаем JSON
            return Response(results, status=status.HTTP_200_OK)

        except Exception as e:
            task.status = 'FAILED'
            task.save()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)