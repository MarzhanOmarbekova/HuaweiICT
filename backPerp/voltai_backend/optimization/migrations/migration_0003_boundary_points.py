from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Добавляет поле boundary_points в WindLocation.
    Поместить в: optimization/migrations/0003_windlocation_boundary_points.py
    """

    dependencies = [
        ('optimization', '0002_alter_aimodelresult_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='windlocation',
            name='boundary_points',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
