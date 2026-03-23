# Запуск на сервере (Docker)

Краткая схема портов и пошаговый запуск без конфликтов.

## Порты (что слушает хост)

| Сервис на хосте | Порт | Описание |
|-----------------|------|----------|
| **Frontend** (nginx в контейнере) | **80** | Веб-интерфейс; внутри контейнера `/api` проксируется на backend |
| **Backend API** | **8000** | REST API и `/health` |

Оба порта должны быть свободны **или** их нужно переопределить (см. ниже).

### Режимы Docker Compose

| Файл | Кто публикует `:8000` | Кто публикует `:80` |
|------|------------------------|-------------------------|
| Только `docker-compose.yml` | контейнер `backend` | контейнер `frontend` |
| `docker-compose.yml` + `docker-compose.vpn.yml` | контейнер **`gluetun`** (внутри него же слушает Node `backend`) | контейнер `frontend` |

Во втором режиме **порт 8000 не дублируется**: сервис `backend` без собственных портов (`network_mode: service:gluetun`), наружу проброшен только `gluetun:8000`.

### Конфликты портов

1. **На машине уже занят 8000 или 80** (другой сайт, старый контейнер):
   - остановите лишнее: `docker ps`, затем `docker stop …` или смените порт в compose.
2. **Смена портов на хосте** — в `docker-compose.yml` замените, например:
   ```yaml
   ports:
     - "8001:8000"   # API снаружи будет http://сервер:8001
   ```
   и для фронта:
   ```yaml
     - "8080:80"
   ```
   Внутри контейнеров порты **8000** и **80** не меняются — только левая часть (`хост:контейнер`).
3. **Нельзя одновременно** запустить два одинаковых стека на одних и тех же портах. Перед сменой режима (обычный ↔ VPN):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.vpn.yml down
   docker compose up -d --build
   ```
4. **OpenVPN (gluetun)** может требовать на хосте `/dev/net/tun` и capability `NET_ADMIN` (в compose уже указано). Если на сервере включён строгий firewall, разрешите **исходящие** HTTPS к `api.groq.com` (или весь трафик через VPN — см. `vpn/README.md`).

---

## Быстрый старт (обычный режим, SQLite)

Подходит для VPS без отдельного PostgreSQL: БД в volume `backend_data`.

### 1. На сервере

```bash
git clone <ваш-репозиторий> mik_edu
cd mik_edu
cp .env.example .env
nano .env   # JWT_SECRET, при необходимости QWEN_API_KEY (Groq)
```

Минимум в `.env` (корень проекта, рядом с `docker-compose.yml`):

```env
JWT_SECRET=длинная-случайная-строка-минимум-32-символа
QWEN_API_KEY=gsk_...   # опционально, для «Сгенерировать с ИИ» в тестах
```

### 2. Сборка и запуск

```bash
docker compose up -d --build
```

### 3. Инициализация БД (первый раз)

```bash
docker compose exec backend npm run init-db
```

Логин по умолчанию: **admin** / **admin** — смените пароль после входа.

### 4. Проверка

- Сайт: `http://IP-СЕРВЕРА` (порт **80**; при смене маппинга — `http://IP-СЕРВЕРА:8080` и т.п.)
- API: `http://IP-СЕРВЕРА:8000/health` — в ответе `"aiConfigured": true`, если задан `QWEN_API_KEY`

### 5. Firewall (пример UFW)

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 8000/tcp   # если API открываете снаружи; иначе можно не публиковать
sudo ufw enable
```

Для продакшена лучше поставить **nginx/Caddy** на 443 и проксировать на `127.0.0.1:80`, а порты 80/8000 не светить в интернет.

---

## Запуск с VPN (Groq через OpenVPN)

Нужен файл **`vpn/client.ovpn`** (см. `vpn/README.md`).

```bash
docker compose -f docker-compose.yml -f docker-compose.vpn.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.vpn.yml exec backend npm run init-db
```

Порты на хосте те же: **80** (сайт), **8000** (API). Фронт использует `frontend/nginx.vpn.conf` и шлёт `/api` на хост **`gluetun:8000`** внутри сети Docker.

---

## PostgreSQL вместо SQLite

В `.env` укажите:

```env
DATABASE_URL=postgresql://USER:PASSWORD@ХОСТ:5432/ИМЯ_БД
```

Если Postgres на **этом же сервере**, а backend в Docker, вместо `localhost` используйте IP хоста в Docker:

- Linux: часто `172.17.0.1` или имя `host.docker.internal` (если добавите в `extra_hosts` в compose).

Проще поднять PostgreSQL отдельным сервисом в `docker-compose` или использовать облачную БД.

---

## Полезные команды

| Действие | Команда |
|----------|---------|
| Логи backend | `docker compose logs -f backend` |
| Логи VPN | `docker compose -f docker-compose.yml -f docker-compose.vpn.yml logs -f gluetun` |
| Перезапуск | `docker compose restart` |
| Остановка | `docker compose down` |

Подробнее об окружении и без прокси/VPN: **`DEPLOY.md`**.
