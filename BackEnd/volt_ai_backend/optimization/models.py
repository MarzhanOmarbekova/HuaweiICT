# optimization/models.py
from django.db import models


# Если используете старую версию, замените JSONField на from django.contrib.postgres.fields import JSONField
# Но с Django 3.1+ просто используем models.JSONField

# ВАЖНО: Если у вас нет модели User, замените эту строку на pass или создайте модель User.
# Здесь мы предполагаем, что вы создадите ее позже.
class User(models.Model):
    name = models.CharField(max_length=100)

    # ... другие поля ...

    def __str__(self):
        return self.name


class WindOptimizationTask(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Ожидает'),
        ('COMPLETED', 'Завершено'),
        ('FAILED', 'Ошибка'),
    ]
    # Используем null=True, чтобы пока не было ошибки, если User не настроен
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    input_data = models.JSONField()
    result_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Task {self.id} - {self.name} ({self.status})"


class AIModelResult(models.Model):
    task = models.OneToOneField(WindOptimizationTask, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    optimal_points = models.JSONField()
    predicted_energy = models.JSONField()
    saved_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Result for Task {self.task.id}"