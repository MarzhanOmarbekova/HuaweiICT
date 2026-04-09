"""
voltai_backend/optimization/cnn_model.py

ИСПРАВЛЕНИЯ:
- grid_size=5 (модель обучена на 5x5 сетке, а не 8x8)
- 3 свёрточных слоя (conv1, conv2, conv3) как в ноутбуке
- fc1: 64->128, fc2: 128->64, fc3: 64->grid_size*grid_size
- Dropout(p=0.3) вместо keep_prob
- prepare_input_data принимает grid_size=5
"""

from typing import List, Dict

import numpy as np
import mindspore
import mindspore.nn as nn
import mindspore.ops as ops
from mindspore import Tensor

mindspore.set_device('CPU')


class WindTurbineCNN(nn.Cell):
    """
    CNN для оценки эффективности ветровых точек.
    Архитектура ТОЧНО соответствует обученной модели (wind_cnn_final.ckpt).

    Вход:  (batch, 2, H, W)  — [wind_speed_norm, wind_dir_norm]
    Выход: (batch, H, W)     — эффективность (0..1) через sigmoid

    Слои:
      Conv: 2→32→64→64
      GlobalAvgPool → reshape (B, 64)
      Dense: 64→128→64→H*W
      Sigmoid + reshape → (B, H, W)
    """

    def __init__(self, input_channels: int = 2, grid_size: int = 5):
        super(WindTurbineCNN, self).__init__()
        self.grid_size = grid_size

        # --- Свёрточные слои ---
        self.conv1 = nn.Conv2d(input_channels, 32, kernel_size=3, pad_mode='pad', padding=1)
        self.bn1   = nn.BatchNorm2d(32)
        self.relu  = nn.ReLU()

        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, pad_mode='pad', padding=1)
        self.bn2   = nn.BatchNorm2d(64)

        self.conv3 = nn.Conv2d(64, 64, kernel_size=3, pad_mode='pad', padding=1)
        self.bn3   = nn.BatchNorm2d(64)

        # --- Голова регрессии ---
        self.fc1     = nn.Dense(64, 128)
        self.dropout = nn.Dropout(p=0.3)
        self.fc2     = nn.Dense(128, 64)
        self.fc3     = nn.Dense(64, grid_size * grid_size)
        self.sigmoid = nn.Sigmoid()

    def construct(self, x):
        # Свёрточный блок
        x = self.relu(self.bn1(self.conv1(x)))   # (B, 32, H, W)
        x = self.relu(self.bn2(self.conv2(x)))   # (B, 64, H, W)
        x = self.relu(self.bn3(self.conv3(x)))   # (B, 64, H, W)

        # Global Average Pooling → вектор
        x = ops.ReduceMean(keep_dims=True)(x, (2, 3))  # (B, 64, 1, 1)
        x = ops.reshape(x, (-1, 64))                    # (B, 64)

        # Полносвязная голова
        x = self.relu(self.fc1(x))   # (B, 128)
        x = self.dropout(x)
        x = self.relu(self.fc2(x))   # (B, 64)
        x = self.fc3(x)              # (B, H*W)
        x = self.sigmoid(x)

        # Возврат как карта эффективностей
        x = ops.reshape(x, (-1, self.grid_size, self.grid_size))  # (B, H, W)
        return x


def prepare_input_data(area_data: List[Dict], grid_size: int = 5) -> np.ndarray:
    """
    Превращает список точек (len = grid_size²) в тензор (1, 2, H, W).

    Каналы:
      0: wind_speed  нормализовано в [0,1] делением на 20 м/с
      1: wind_direction / 360  нормализовано в [0,1]

    Args:
        area_data: список словарей с ключами 'wind_speed', 'wind_direction'
        grid_size: размер сетки (5 по умолчанию — как при обучении)

    Returns:
        np.ndarray shape (1, 2, grid_size, grid_size) dtype float32
    """
    wind_speed = np.zeros((grid_size, grid_size), dtype=np.float32)
    wind_dir   = np.zeros((grid_size, grid_size), dtype=np.float32)

    for i, point in enumerate(area_data):
        row = i // grid_size
        col = i % grid_size
        if row >= grid_size or col >= grid_size:
            break
        wind_speed[row, col] = float(np.clip(point['wind_speed'] / 20.0, 0.0, 1.0))
        wind_dir[row, col]   = float(point['wind_direction'] / 360.0)

    input_array = np.stack([wind_speed, wind_dir], axis=0)          # (2, H, W)
    input_array = np.expand_dims(input_array, axis=0).astype(np.float32)  # (1, 2, H, W)
    return input_array
