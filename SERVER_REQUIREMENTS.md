# Требования к запуску сервера

Документ описывает минимальные и рекомендуемые требования для запуска `mik_edu` в продакшене.

## 1) Сервер и ОС

- Linux VPS/DS (Ubuntu 22.04+ или аналог).
- CPU: 2 vCPU (рекомендуется 4 vCPU при одновременной работе 30+ пользователей).
- RAM: минимум 2 GB (рекомендуется 4 GB).
- Диск: минимум 10 GB свободного места (рекомендуется 20+ GB).
- Права: пользователь с доступом к Docker (`sudo` или член группы `docker`).

## 2) Обязательное ПО

- Docker Engine 24+.
- Docker Compose Plugin 2+ (`docker compose`).
- Git.
- Curl (для health-check и диагностики).

Проверка:

```bash
docker --version
docker compose version
git --version
curl --version
```

## 3) Сеть и порты

- Входящие порты:
  - `80/tcp` — фронтенд (nginx в контейнере).
  - `8000/tcp` — backend API (можно закрыть внешне, если есть reverse proxy).
- Исходящий доступ:
  - к `api.groq.com:443` (если используется генерация ИИ).

Проверка занятости портов:

```bash
ss -ltnp | grep -E ':80|:8000'
```

## 4) Переменные окружения

В корне проекта должен быть файл `.env` (рядом с `docker-compose.yml`).

Минимально обязательно:

```env
JWT_SECRET=сложная_строка_не_менее_32_символов
```

Для ИИ (опционально):

```env
QWEN_API_KEY=gsk_...
# Опционально:
# QWEN_MODEL=qwen/qwen3-32b
# QWEN_API_URL=https://api.groq.com/openai/v1/chat/completions
```

Важно:

- Используйте только `api.groq.com` (с буквой `q`, не `grok.com`).
- `.env` не должен попадать в git.

## 5) Хранилище данных

Контейнеры используют docker volumes:

- `backend_data` — база (sqlite) и служебные данные.
- `backend_uploads` — загруженные материалы.

Рекомендации:

- Настроить регулярные бэкапы volume.
- Следить за свободным местом на диске (`df -h`).

## 6) Первый запуск

```bash
git clone <repo_url> mik_edu
cd mik_edu
cp .env.example .env
# отредактировать .env

docker compose up -d --build
docker compose exec backend npm run init-db
```

Проверка:

```bash
curl -s http://127.0.0.1:8000/health
curl -sI http://127.0.0.1/
```

Ожидается:

- API health возвращает `status: ok`.
- Фронтенд отвечает `HTTP/1.1 200 OK`.

## 7) Рекомендации по продакшену

- Обязательно включить HTTPS (Nginx/Caddy + Let's Encrypt).
- Сразу сменить пароль пользователя `admin`.
- Ограничить доступ к `8000` извне (если API не нужен публично).
- Настроить мониторинг и ротацию логов (`docker compose logs` / journald).

## 8) Типовые проблемы

- `502 Bad Gateway`:
  - backend не поднялся или не healthy;
  - порт `8000` занят;
  - контейнеры не пересозданы после обновления.
- Ошибка ИИ `ENOTFOUND`:
  - неверный `QWEN_API_URL` (`grok.com` вместо `groq.com`);
  - нет исходящего доступа в интернет.

Диагностика:

```bash
docker compose ps
docker compose logs --tail=200 backend
docker compose logs --tail=200 frontend
```

