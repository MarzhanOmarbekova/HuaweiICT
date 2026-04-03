from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='EnergyDevice',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('device_type', models.CharField(choices=[('wind', 'Wind Turbine'), ('solar', 'Solar Panel'), ('hybrid', 'Hybrid')], max_length=20)),
                ('capacity_kw', models.FloatField()),
                ('latitude', models.FloatField(blank=True, null=True)),
                ('longitude', models.FloatField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('installed_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='devices', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'energy_devices'},
        ),
        migrations.CreateModel(
            name='UserBalance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('energy_credits', models.FloatField(default=0.0)),
                ('locked_credits', models.FloatField(default=0.0)),
                ('coin_balance', models.FloatField(default=100.0)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='balance', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'user_balances'},
        ),
        migrations.CreateModel(
            name='EnergyData',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('energy_kwh', models.FloatField()),
                ('recorded_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('source', models.CharField(default='manual', max_length=50)),
                ('device', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='readings', to='trading.energydevice')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='energy_records', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'energy_data', 'ordering': ['-recorded_at']},
        ),
        migrations.CreateModel(
            name='EnergyOffer',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('energy_amount', models.FloatField()),
                ('available_amount', models.FloatField()),
                ('price_per_kwh', models.FloatField()),
                ('status', models.CharField(choices=[('active', 'Active'), ('partially_sold', 'Partially Sold'), ('sold', 'Sold Out'), ('cancelled', 'Cancelled'), ('expired', 'Expired')], default='active', max_length=20)),
                ('description', models.TextField(blank=True)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('device', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='offers', to='trading.energydevice')),
                ('seller', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='offers', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'energy_offers', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='EnergyBid',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('energy_amount', models.FloatField()),
                ('bid_price_per_kwh', models.FloatField()),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected'), ('withdrawn', 'Withdrawn')], default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('bidder', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bids', to=settings.AUTH_USER_MODEL)),
                ('offer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bids', to='trading.energyoffer')),
            ],
            options={'db_table': 'energy_bids', 'ordering': ['-bid_price_per_kwh', '-created_at']},
        ),
        migrations.CreateModel(
            name='EnergyContract',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('energy_amount', models.FloatField()),
                ('price_per_kwh', models.FloatField()),
                ('total_price', models.FloatField()),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('executed', 'Executed'), ('failed', 'Failed'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('contract_hash', models.CharField(blank=True, max_length=64)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('executed_at', models.DateTimeField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True)),
                ('buyer', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='bought_contracts', to=settings.AUTH_USER_MODEL)),
                ('offer', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='contracts', to='trading.energyoffer')),
                ('seller', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='sold_contracts', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'energy_contracts', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('transaction_id', models.CharField(max_length=36, unique=True)),
                ('tx_type', models.CharField(choices=[('trade', 'P2P Trade'), ('mint', 'Energy Minted'), ('burn', 'Energy Burned')], max_length=10)),
                ('energy_amount', models.FloatField()),
                ('price_per_kwh', models.FloatField(default=0.0)),
                ('total_price', models.FloatField(default=0.0)),
                ('contract_hash', models.CharField(blank=True, max_length=64)),
                ('blockchain_block_index', models.IntegerField(blank=True, null=True)),
                ('blockchain_block_hash', models.CharField(blank=True, max_length=64)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('buyer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bought_txs', to=settings.AUTH_USER_MODEL)),
                ('contract', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='transaction', to='trading.energycontract')),
                ('seller', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sold_txs', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'transactions', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='BlockchainBlock',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('index', models.IntegerField(unique=True)),
                ('block_hash', models.CharField(max_length=64, unique=True)),
                ('previous_hash', models.CharField(max_length=64)),
                ('nonce', models.IntegerField(default=0)),
                ('timestamp', models.FloatField()),
                ('transaction_count', models.IntegerField(default=0)),
                ('transactions_data', models.JSONField(default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'blockchain_blocks', 'ordering': ['-index']},
        ),
        migrations.AddIndex(
            model_name='energyoffer',
            index=models.Index(fields=['status', 'created_at'], name='energy_offers_status_created_idx'),
        ),
        migrations.AddIndex(
            model_name='energyoffer',
            index=models.Index(fields=['seller', 'status'], name='energy_offers_seller_status_idx'),
        ),
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(fields=['seller', 'created_at'], name='transactions_seller_created_idx'),
        ),
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(fields=['buyer', 'created_at'], name='transactions_buyer_created_idx'),
        ),
    ]
