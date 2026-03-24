# Запуск на сервере (Docker)

Краткая схема портов и пошаговый запуск.

## Порты (что слушает хост)

| Сервис на хосте | Порт | Описание |
|-----------------|------|----------|
| **Frontend** (nginx в контейнере) | **80** | Веб-интерфейс; внутри контейнера `/api` проксируется на backend |
| **Backend API** | **8000** | REST API и `/health` |

## Быстрый старт

1. Подготовка:

```bash
git clone <ваш-репозиторий> mik_edu
cd mik_edu
cp .env.example .env
```

2. Запуск:

```bash
docker compose up -d --build
```

3. Инициализация БД (первый раз):

```bash
docker compose exec backend npm run init-db
```

## Проверка

- Сайт: `http://IP-СЕРВЕРА/`
- API: `http://IP-СЕРВЕРА:8000/health`

Если фронтенд был ранее на другом порту, пересоздайте контейнеры:

```bash
git pull
docker compose build --no-cache frontend
docker compose up -d --force-recreate
```

## Полезные команды

| Действие | Команда |
|----------|---------|
| Логи backend | `docker compose logs -f backend` |
| Логи frontend | `docker compose logs -f frontend` |
| Перезапуск | `docker compose restart` |
| Остановка | `docker compose down` |

Подробнее: `DEPLOY.md`.
