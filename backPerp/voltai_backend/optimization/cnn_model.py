from typing import List, Dict

import numpy as np
import mindspore
import mindspore.nn as nn
import mindspore.ops as ops
from mindspore import Tensor, context

# CPU (для Huawei Ascend потом можно сменить device_target)
context.set_context(mode=context.GRAPH_MODE, device_target="CPU")


class WindTurbineCNN(nn.Cell):
    """
    CNN для оценки эффективности точки по ветру.
    Вход: (batch, 2, H, W) = [wind_speed, wind_direction]
    Выход: (batch, H, W) — эффективность (0..1) через sigmoid.
    Архитектура головы: 64 -> 32 -> 1 (через Dense).
    """

    def __init__(self, input_channels: int = 2, grid_size: int = 8):
        super(WindTurbineCNN, self).__init__()

        # Фичи извлекаем свёртками
        self.conv1 = nn.Conv2d(
            in_channels=input_channels,
            out_channels=32,
            kernel_size=3,
            pad_mode="pad",
            padding=1,
        )
        self.bn1 = nn.BatchNorm2d(32)
        self.relu = nn.ReLU()

        self.conv2 = nn.Conv2d(
            in_channels=32,
            out_channels=64,
            kernel_size=3,
            pad_mode="pad",
            padding=1,
        )
        self.bn2 = nn.BatchNorm2d(64)

        # Глобальный пуллинг → один вектор на всю карту
        self.global_pool = nn.AdaptiveAvgPool2d(1)

        # Голова: 64 -> 32 -> 1
        self.fc1 = nn.Dense(64, 32)
        self.dropout = nn.Dropout(p=0.3)
        self.fc2 = nn.Dense(32, grid_size * grid_size)

        # Активации
        self.sigmoid = nn.Sigmoid()
        self.softmax = nn.Softmax(axis=1)  # если захотим softmax по всем точкам

        self.grid_size = grid_size

    def construct(self, x):
        # x: (B, 2, H, W)
        x = self.conv1(x)      # (B, 32, H, W)
        x = self.bn1(x)
        x = self.relu(x)

        x = self.conv2(x)      # (B, 64, H, W)
        x = self.bn2(x)
        x = self.relu(x)

        # Глобальный пуллинг: (B, 64, 1, 1)
        x = self.global_pool(x)
        x = ops.reshape(x, (-1, 64))  # (B, 64)

        # Голова: 64 -> 32 -> 1*(H*W)
        x = self.fc1(x)        # (B, 32)
        x = self.relu(x)
        x = self.dropout(x)
        x = self.fc2(x)        # (B, H*W)

        # Sigmoid по каждому логиту → эффективности 0..1
        x = self.sigmoid(x)    # (B, H*W)

        # Возвращаем как карту (B, H, W)
        x = ops.reshape(x, (-1, self.grid_size, self.grid_size))
        return x

    def forward_with_softmax(self, x):
        """
        Опциональный метод, если нужно распределение softmax по всей карте.
        Возвращает:
          - efficiency_map: sigmoid(H, W)
          - softmax_map: softmax(H, W) (сумма = 1)
        """
        # Повторяем до fc2
        feat = self.conv1(x)
        feat = self.bn1(feat)
        feat = self.relu(feat)

        feat = self.conv2(feat)
        feat = self.bn2(feat)
        feat = self.relu(feat)

        feat = self.global_pool(feat)
        feat = ops.reshape(feat, (-1, 64))

        feat = self.fc1(feat)
        feat = self.relu(feat)
        feat = self.dropout(feat)
        logits = self.fc2(feat)      # (B, H*W)

        # Sigmoid‑карта
        eff = self.sigmoid(logits)
        eff_map = ops.reshape(eff, (-1, self.grid_size, self.grid_size))

        # Softmax по всем точкам
        probs = self.softmax(logits)  # (B, H*W)
        probs_map = ops.reshape(probs, (-1, self.grid_size, self.grid_size))

        return eff_map, probs_map


def prepare_input_data(area_data: List[Dict], grid_size: int = 8) -> np.ndarray:
    """
    Превращает список точек (len = grid_size^2) в тензор (1, 2, H, W).
    Каналы:
      0: wind_speed  (м/с)
      1: wind_direction / 360 (нормализация в [0,1])
    """

    wind_speed = np.zeros((grid_size, grid_size), dtype=np.float32)
    wind_dir = np.zeros((grid_size, grid_size), dtype=np.float32)

    for i, point in enumerate(area_data):
        row = i // grid_size
        col = i % grid_size
        if row >= grid_size or col >= grid_size:
            continue

        wind_speed[row, col] = np.clip(point["wind_speed"] / 20.0, 0.0, 1.0)
        wind_dir[row, col] = point["wind_direction"] / 360.0

    input_array = np.stack(
        [
            wind_speed,
            wind_dir,
        ],
        axis=0,
    )

    input_array = np.expand_dims(input_array, axis=0).astype(np.float32)
    return input_array
