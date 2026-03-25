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

## 502 Bad Gateway (nginx)

Обычно nginx не достучался до **backend**. Проверьте:

```bash
docker compose ps
docker compose logs --tail=100 backend
docker compose exec frontend curl -fsS http://backend:8000/health
```

Если `curl` из контейнера `frontend` не отвечает — backend не в той же сети или не слушает `:8000`. После смены `docker-compose.yml` (сеть `mik_edu`) пересоздайте контейнеры: `docker compose up -d --force-recreate`.

Конфиг nginx **внутри** образа фронта — только **`frontend/nginx.conf`**. Файл **`nginx.edge-proxy.example.conf`** в корне — отдельный пример внешнего прокси; не подменяйте им `default.conf` в контейнере фронта (иначе возможен proxy на самого себя и снова 502).

## Полезные команды

| Действие | Команда |
|----------|---------|
| Логи backend | `docker compose logs -f backend` |
| Логи frontend | `docker compose logs -f frontend` |
| Перезапуск | `docker compose restart` |
| Остановка | `docker compose down` |

Подробнее: `DEPLOY.md`.
