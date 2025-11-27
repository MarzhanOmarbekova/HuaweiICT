import mindspore.nn as nn
from mindspore.ops import operations as P
from mindspore import nn as mindspore_nn  # Используем alias, чтобы избежать конфликтов


class WindEfficiencyCNN(mindspore_nn.Cell):
    """
    CNN с многоканальным Softmax-выходом (3 класса пригодности).
    Выполняет требования преподавателя: нисходящая архитектура и Softmax.
    """

    def __init__(self, num_input_channels):
        super().__init__()

        self.relu = mindspore_nn.ReLU()

        # 1. Слой 64 канала (нисходящая архитектура)
        self.conv1 = mindspore_nn.Conv2d(num_input_channels, 64, kernel_size=5, padding=2, pad_mode='pad')

        # 2. Слой 32 канала
        self.conv2 = mindspore_nn.Conv2d(64, 32, kernel_size=3, padding=1, pad_mode='pad')

        # 3. ФИНАЛЬНЫЙ СЛОЙ: Выводим 3 КАНАЛА (класса: Плохо, Средне, Хорошо)
        self.output_conv = mindspore_nn.Conv2d(32, 3, kernel_size=1, padding=0, pad_mode='pad')

        # Softmax для нормализации вероятностей по 3 каналам
        self.softmax = mindspore_nn.Softmax(axis=1)

    def construct(self, x):
        x = self.relu(self.conv1(x))
        x = self.relu(self.conv2(x))
        efficiency_logits = self.output_conv(x)

        # Сумма вероятностей по 3 классам для каждого пикселя равна 1
        return self.softmax(efficiency_logits)