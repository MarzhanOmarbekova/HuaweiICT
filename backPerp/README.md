# ⚡ VoltAI — Intelligent Wind Energy Optimization Backend

VoltAI — это backend для интеллектуальной оптимизации размещения ветротурбин с использованием AI (MindSpore CNN) и реальных климатических данных.

**Технологии:** Django + Django REST Framework + JWT + PostgreSQL + MindSpore (CNN)

---

## 📋 Содержание

- [Требования](#требования)
- [Установка](#установка)
- [Настройка PostgreSQL](#настройка-postgresql)
- [Настройка Django settings.py](#настройка-django-settingspy)
- [Миграции и запуск](#миграции-и-запуск)
- [API Эндпоинты](#api-эндпоинты)
  - [Регистрация](#1-регистрация-пользователя)
  - [Логин](#2-логин)
  - [Обновление токена](#3-обновление-access-токена)
  - [Оптимизация ветропарка](#4-оптимизация-ветропарка)
  - [История расчётов](#5-история-расчётов)
- [Примеры запросов curl](#примеры-запросов-curl)
- [Контакты](#контакты)

---

## 🛠 Требования

- Python 3.10+
- PostgreSQL 13+
- pip, virtualenv

---

## 📦 Установка

```
# Клонируйте репозиторий
git clone https://github.com/MarzhanOmarbekova/HuaweiICT.git
cd voltai_backend

# Создайте виртуальное окружение
python -m venv venv

# Активируйте окружение
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Установите зависимости
pip install -r requirements.txt
```

---

## 🗄 Настройка PostgreSQL

### Шаг 1: Установите PostgreSQL (если еще не установлен)

**Ubuntu/Debian:**
```
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS:**
```
brew install postgresql@15
```

**Windows:**  
Скачайте инсталлятор с [postgresql.org](https://www.postgresql.org/download/windows/)

### Шаг 2: Создайте базу данных

Войдите в PostgreSQL под пользователем `postgres`:

```
sudo -u postgres psql
```

В консоли PostgreSQL выполните:

```
CREATE DATABASE voltai_db;
```

> **Примечание:** Мы используем стандартного пользователя `postgres`.  
> У каждого свой пароль — вы укажете его в `settings.py` на следующем шаге.

---

## ⚙️ Настройка Django `settings.py`

Откройте файл `voltai_backend/settings.py` и настройте:

###  DATABASES (PostgreSQL с пользователем postgres)

```
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'voltai_db',           # Имя базы данных (создали выше)
        'USER': 'postgres',            # Стандартный пользователь PostgreSQL
        'PASSWORD': 'YOUR_PASSWORD',   # ЗАМЕНИТЕ НА ВАШ ПАРОЛЬ
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

> ⚠️ **ВАЖНО:** Замените `YOUR_PASSWORD` на ваш реальный пароль от пользователя `postgres`.


### CORS (для работы с фронтендом)

```
CORS_ALLOWED_ORIGINS = [
    'http://localhost:4200',  # Angular
    'http://localhost:3000',  # React
]

# Или для разработки можно открыть полностью:
# CORS_ALLOW_ALL_ORIGINS = True
```

---

## 🚀 Миграции и запуск

```
Перейдите в папку с manage.py (если вы еще не там)
cd voltai_backend

# Примените миграции
python manage.py makemigrations
python manage.py migrate

# (Опционально) Создайте суперпользователя для админки
python manage.py createsuperuser

# Запустите сервер разработки
python manage.py runserver
```

Сервер будет доступен по адресу: **http://127.0.0.1:8000/**

---

## 📡 API Эндпоинты

### Авторизация

Все защищённые эндпоинты требуют JWT токен в заголовке:

```
Authorization: Bearer <ACCESS_TOKEN>
```

---

### 1. Регистрация пользователя

**Endpoint:** `POST /api/auth/register/`

**Описание:** Создаёт нового пользователя и возвращает JWT токены.

**Тело запроса:**

```
{
  "username": "testuser2",
  "email": "test2@voltai.com",
  "password": "test123456",
  "is_company": false
}
```

**Пример ответа (201 Created):**

```
{
  "message": "User registered successfully",
  "user": {
    "id": 2,
    "username": "testuser2",
    "email": "test2@voltai.com",
    "is_company": false
  },
  "tokens": {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}

```

---

### 2. Логин

**Endpoint:** `POST /api/auth/login/`

**Описание:** Авторизует пользователя по username/email и паролю.

**Тело запроса:**

```
{
  "username": "testuser",
  "password": "test123456"
}
```

**Пример ответа (200 OK):**

```
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "user@example.com",
    "is_company": false
  },
  "tokens": {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

Сохраните `access` токен — он понадобится для остальных запросов.

---

### 3. Обновление access-токена

**Endpoint:** `POST /api/auth/token/refresh/`

**Тело запроса:**

```
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Пример ответа (200 OK):**

```
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

---

### 4. Оптимизация ветропарка

**Endpoint:** `POST /api/optimize-wind/`

**Авторизация:** Требуется `Authorization: Bearer <ACCESS_TOKEN>`

**Описание:**

Принимает координаты прямоугольной области и количество турбин. Backend:

1. Строит сетку точек внутри области
2. Запрашивает данные о ветре для каждой точки (Open-Meteo API)
3. Формирует карту ветра (скорость + направление)
4. Прогоняет через CNN (MindSpore) с архитектурой 64 → 32 → 1
5. Получает карту эффективности (0..1) для каждой точки
6. Brute-force алгоритм выбирает N лучших точек с ограничением по расстоянию
7. Оценивает энергию за 1/3/6/12 месяцев
8. Сохраняет результат в БД

**Тело запроса:**

```
{
  "coordinates": {
    "lat_min": 43.25,
    "lat_max": 43.30,
    "lon_min": 76.90,
    "lon_max": 76.95
  },
  "num_turbines": 3
}
```

**Параметры:**

- `lat_min`, `lat_max` — широта (южная/северная граница)
- `lon_min`, `lon_max` — долгота (западная/восточная граница)
- `num_turbines` — количество турбин для размещения (1-100)

**Пример ответа (200 OK):**

```
{
  "location_id": "e2a1b9a3-0c3b-4d91-9f4d-123456789abc",
  "optimal_points": [
    {
      "lat": 43.256,
      "lon": 76.945,
      "efficiency": 0.93
    },
    {
      "lat": 43.268,
      "lon": 76.930,
      "efficiency": 0.90
    },
    {
      "lat": 43.279,
      "lon": 76.952,
      "efficiency": 0.88
    }
  ],
  "predicted_energy": {
    "1_month": "3200.00 kWh",
    "3_months": "8900.00 kWh",
    "6_months": "16800.00 kWh",
    "12_months": "33000.00 kWh"
  },
  "environmental_summary": {
    "avg_wind_speed": "7.20 m/s",
    "avg_elevation": "0.00 m",
    "soil_types": ["Unknown"]
  },
  "turbine_details": [
    {
      "latitude": 43.256,
      "longitude": 76.945,
      "efficiency": 0.93,
      "wind_speed": 7.8,
      "energy_predictions": {
        "1_month": 1100.0,
        "3_months": 3300.0,
        "6_months": 6600.0,
        "12_months": 13200.0,
        "avg_power_kw": 15.0
      }
    }
  ]
}
```

---

### 5. История расчётов

**Endpoint:** `GET /api/optimization-history/`

**Авторизация:** Требуется `Authorization: Bearer <ACCESS_TOKEN>`

**Описание:** Возвращает все расчёты оптимизации для текущего пользователя.

**Пример ответа (200 OK):**

```
{
  "history": [
    {
      "id": "e2a1b9a3-0c3b-4d91-9f4d-123456789abc",
      "created_at": "2025-11-27T09:15:00Z",
      "num_turbines": 3,
      "status": "completed",
      "energy_12_months": "33000.00 kWh",
      "optimal_points": [
        {
          "lat": 43.256,
          "lon": 76.945,
          "efficiency": 0.93
        },
        {
          "lat": 43.268,
          "lon": 76.930,
          "efficiency": 0.90
        }
      ]
    }
  ]
}
```

---

## 🧪 Примеры запросов (curl)

### Регистрация

```
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "user@example.com",
    "password": "test123456"
  }'
```

### Логин

```
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123456"
  }'
```

### Оптимизация (замените <ACCESS_TOKEN> на ваш токен)

```
curl -X POST http://127.0.0.1:8000/api/optimize-wind/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "coordinates": {
      "lat_min": 43.25,
      "lat_max": 43.30,
      "lon_min": 76.90,
      "lon_max": 76.95
    },
    "num_turbines": 3
  }'
```

### История

```
curl -X GET http://127.0.0.1:8000/api/optimization-history/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 📝 Для фронтенд-разработчиков

### Быстрый старт интеграции

1. **Регистрация/Логин:**
   - Вызовите `/api/auth/register/` или `/api/auth/login/`
   - Сохраните `access` токен в localStorage/sessionStorage

2. **Использование токена:**
   - Добавляйте заголовок ко всем запросам:
   ```
   headers: {
     'Authorization': `Bearer ${accessToken}`,
     'Content-Type': 'application/json'
   }
   ```

3. **Оптимизация:**
   - Получите координаты области от пользователя (через карту)
   - Отправьте POST запрос на `/api/optimize-wind/`
   - Отобразите полученные точки на карте

4. **История:**
   - GET запрос на `/api/optimization-history/`
   - Отобразите список прошлых расчётов

---

## 🧠 Технические детали

### ML/AI Pipeline

- **Входные данные:** Скорость и направление ветра с Open-Meteo Weather API
- **CNN архитектура:**
  - Input: (batch, 2, H, W) — карта ветра
  - Conv layers: 2 → 32 → 64
  - Global Average Pooling
  - Dense layers: 64 → 32 → H*W
  - Activation: Sigmoid → эффективность (0..1)
- **Оптимизация:** Brute-force с constraint по минимальной дистанции между турбинами (0.5 км)
- **Энергия:** Расчёт по формуле P = 0.5 * ρ * A * V³ * Cp * efficiency

---

## 🔒 Безопасность

- Все пароли хешируются через Django (PBKDF2)
- JWT токены с коротким временем жизни (1 час для access, 7 дней для refresh)
- API защищены authentication middleware
- CORS настроен для конкретных доменов

---


