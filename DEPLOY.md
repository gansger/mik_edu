# Запуск МИК-ОБРАЗОВАНИЕ на хосте

Инструкция по развёртыванию проекта на сервере (VPS, выделенный сервер и т.п.).

**Порты:** фронтенд — **3000**, бэкенд (API) — **8000**.

---

## Требования

- **Node.js** 18+ (рекомендуется 20 LTS)
- Для PostgreSQL: установленный PostgreSQL (если не используете SQLite)

---

## Вариант 1: Один процесс (backend раздаёт фронтенд)

Подходит для простого хостинга: один порт, один процесс.

### 1. Установка зависимостей

```bash
cd backend
npm ci
```

```bash
cd frontend
npm ci
```

### 2. Сборка фронтенда

```bash
cd frontend
npm run build
```

После сборки появится папка `frontend/dist`.

### 3. Копирование сборки в backend

Чтобы backend раздавал сайт с одного порта:

```bash
# из корня проекта (mik_edu)
cp -r frontend/dist backend/dist
```

В Windows (PowerShell):

```powershell
Copy-Item -Recurse frontend\dist backend\dist
```

### 4. Настройка окружения (backend)

В папке `backend` создайте файл `.env` (можно скопировать из `.env.example`):

```bash
cd backend
cp .env.example .env
```

Отредактируйте `.env`:

| Переменная      | Описание |
|-----------------|----------|
| `PORT`          | Порт сервера (по умолчанию 8000) |
| `JWT_SECRET`    | Секретный ключ для JWT (обязательно смените в проде) |
| `DATABASE_URL`  | Не задавать или `sqlite://` — использовать SQLite. Для PostgreSQL: `postgresql://user:password@host:5432/dbname` |
| `UPLOAD_DIR`    | Папка загрузок лекций (по умолчанию `./uploads`) |
| `SQLITE_PATH`   | (опционально) Путь к файлу SQLite (по умолчанию `data/mik_edu.db`) |
| `QWEN_API_KEY`  | (опционально) Ключ Groq для генерации вопросов теста (console.groq.com). Без него кнопка «Сгенерировать с ИИ» не работает |
| `QWEN_MODEL`    | (опционально) Модель Groq, по умолчанию `qwen/qwen3-32b` |
| `QWEN_API_URL`  | (опционально) URL API Groq, по умолчанию `https://api.groq.com/openai/v1/chat/completions` |

**Пример .env для хостинга с SQLite (с генерацией вопросов ИИ):**

```env
PORT=8000
JWT_SECRET=ваш-длинный-секретный-ключ-для-продакшена
UPLOAD_DIR=./uploads
# Генерация вопросов теста (Groq):
QWEN_API_KEY=gsk_ваш_ключ_из_console_groq_com
QWEN_MODEL=qwen/qwen3-32b
QWEN_API_URL=https://api.groq.com/openai/v1/chat/completions
```

**Пример для PostgreSQL:**

```env
PORT=8000
JWT_SECRET=ваш-длинный-секретный-ключ
DATABASE_URL=postgresql://user:password@localhost:5432/mik_edu
UPLOAD_DIR=./uploads
```

### 5. Инициализация БД (при первом запуске)

Для пустой БД создайте таблицы и учётку администратора:

```bash
cd backend
npm run init-db
```

Опционально: заполнить тестовыми группами, предметами и студентами:

```bash
npm run seed
```

### 6. Запуск сервера

```bash
cd backend
npm start
```

Сайт и API будут доступны по адресу **http://хост:8000** (или по выбранному порту).

Для постоянной работы в фоне используйте **pm2**:

```bash
npm install -g pm2
cd backend
pm2 start server.js --name mik-edu
pm2 save
pm2 startup
```

---

## Вариант 2: Backend и frontend отдельно

Backend на порту 8000, фронтенд на порту 3000. Удобно при разработке или когда фронт отдаёт nginx.

### Backend

```bash
cd backend
npm ci
# создать и заполнить .env (PORT=8000)
npm run init-db   # при необходимости
npm start
```

API: **http://хост:8000**

### Frontend (режим разработки)

```bash
cd frontend
npm ci
npm run dev
```

В `frontend/vite.config.js` указан proxy `/api` → `http://localhost:8000`. Сайт: **http://localhost:3000**.

### Frontend (сборка под nginx)

```bash
cd frontend
npm ci
npm run build
```

Раздавайте папку `frontend/dist` через nginx на порту 3000. В конфиге nginx прокинуть запросы с `/api` на backend:

```nginx
location /api {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location / {
    root /path/to/frontend/dist;
    try_files $uri $uri/ /index.html;
}
```

---

## Вариант 3: Docker Compose

В корне проекта создайте файл `.env` (рядом с `docker-compose.yml`) и задайте переменные:

```env
JWT_SECRET=ваш-длинный-секретный-ключ
# Для генерации вопросов теста с ИИ (Groq):
QWEN_API_KEY=gsk_ваш_ключ_из_console_groq_com
```

Затем:

```bash
docker compose up -d --build
```

- **Фронтенд:** http://localhost:3000  
- **Бэкенд (API):** http://localhost:8000  

Фронтенд-контейнер проксирует запросы `/api` на бэкенд, поэтому приложение можно открывать по одному адресу: **http://localhost:3000**.

Без `QWEN_API_KEY` в `.env` на сервере генерация вопросов теста («Сгенерировать с ИИ») будет возвращать ошибку «Генерация ИИ не настроена».

**Важно:** файл `.env` должен лежать **в корне проекта** (в той же папке, где `docker-compose.yml`), а не в `backend/`. Docker Compose подставляет переменные из этого файла при запуске контейнеров.

**Проверка:** откройте в браузере `http://ваш-сервер:8000/health` (или `http://ваш-сервер:3000/api/health`, если заходите через фронт). В ответе должно быть `"aiConfigured": true`. Если `false`, ключ в контейнер не попал: проверьте, что `.env` в корне проекта и перезапустите: `docker compose down && docker compose up -d`.

---

## Проверка после запуска

1. Открыть в браузере: **http://ваш-хост:8000** (Вариант 1) или **http://ваш-хост:3000** (Вариант 2 или 3).
2. Войти: логин **admin**, пароль **admin** (если не меняли после `init-db`).
3. Сразу сменить пароль администратора в разделе «Пользователи» (ФИО / пароль).

---

## Полезные команды

| Действие              | Команда (из папки backend) |
|-----------------------|----------------------------|
| Запуск API            | `npm start`                |
| Запуск с автоперезагрузкой | `npm run dev`        |
| Инициализация БД      | `npm run init-db`          |
| Сиды (группы, студенты) | `npm run seed`           |

---

## Безопасность на проде

1. Задайте надёжный **JWT_SECRET** в `.env`.
2. Смените пароль **admin** после первого входа.
3. Не храните `.env` в репозитории; на хосте создайте его вручную.
4. При использовании nginx настройте HTTPS (Let's Encrypt).
5. Папку **uploads** ограничьте доступом только для приложения (не отдавать напрямую с веб-сервера без проверки прав).
