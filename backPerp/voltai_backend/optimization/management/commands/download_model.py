"""
Management command to download the trained model checkpoint from Huawei OBS.
Save as: voltai_backend/optimization/management/commands/download_model.py

Usage:
  python manage.py download_model

Set environment variables:
  HUAWEI_OBS_ACCESS_KEY=...
  HUAWEI_OBS_SECRET_KEY=...
  HUAWEI_OBS_ENDPOINT=obs.ap-southeast-1.myhuaweicloud.com
  HUAWEI_OBS_BUCKET=voltai-models
"""

import os
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Download MindSpore CNN checkpoint from Huawei OBS'

    def add_arguments(self, parser):
        parser.add_argument(
            '--obs-key',
            default='voltai-model-deploy/wind_cnn_best.ckpt',
            help='OBS object key (default: voltai-model-deploy/wind_cnn_best.ckpt)'
        )
        parser.add_argument(
            '--local-path',
            default=None,
            help='Local save path (default: optimization/wind_cnn_best.ckpt)'
        )

    def handle(self, *args, **options):
        # Get credentials from environment or settings
        access_key = os.environ.get('HUAWEI_OBS_ACCESS_KEY') or getattr(settings, 'HUAWEI_OBS_ACCESS_KEY', '')
        secret_key = os.environ.get('HUAWEI_OBS_SECRET_KEY') or getattr(settings, 'HUAWEI_OBS_SECRET_KEY', '')
        endpoint   = os.environ.get('HUAWEI_OBS_ENDPOINT', 'obs.ap-southeast-1.myhuaweicloud.com')
        bucket     = os.environ.get('HUAWEI_OBS_BUCKET', 'voltai-models')

        if not access_key or not secret_key:
            self.stderr.write(
                'ERROR: Set HUAWEI_OBS_ACCESS_KEY and HUAWEI_OBS_SECRET_KEY environment variables'
            )
            return

        obs_key    = options['obs_key']
        local_path = options['local_path'] or os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            'wind_cnn_best.ckpt'
        )

        self.stdout.write(f'Downloading from OBS:')
        self.stdout.write(f'  Bucket: {bucket}')
        self.stdout.write(f'  Key:    {obs_key}')
        self.stdout.write(f'  Local:  {local_path}')

        try:
            from obs import ObsClient
        except ImportError:
            self.stderr.write('ERROR: Install obs SDK: pip install esdk-obs-python')
            return

        client = ObsClient(
            access_key_id=access_key,
            secret_access_key=secret_key,
            server=f'https://{endpoint}'
        )

        resp = client.getObject(bucket, obs_key, downloadPath=local_path)
        if resp.status < 300:
            size_mb = os.path.getsize(local_path) / 1024 / 1024
            self.stdout.write(self.style.SUCCESS(
                f'Downloaded successfully: {local_path} ({size_mb:.1f} MB)'
            ))
        else:
            self.stderr.write(f'ERROR: OBS download failed with status {resp.status}: {resp.errorMessage}')
