# МИК-ОБРАЗОВАНИЕ

Интерактивная платформа для обучения студентов с разделением по группам, ролями администратора и студента, материалами (лекции в PDF/DOCX/Markdown) и учётом успеваемости.

## Стек

- **Frontend:** React 18, Vite, React Router, React Markdown
- **Backend:** Node.js, Express
- **БД:** PostgreSQL

## Возможности

- **Авторизация** по логину и паролю (JWT).
- **Роли:** администратор и студент.
- **Студент:** просмотр материалов только своей группы, чтение лекций онлайн (PDF, Markdown), просмотр своей успеваемости.
- **Администратор:** создание групп → предметов → модулей → лекций и тестов; загрузка документов (PDF, DOCX, MD); управление пользователями (учётные записи с ролями); просмотр успеваемости по группам.

## Запуск локально

### 1. PostgreSQL

Установите PostgreSQL и создайте базу:

```bash
createdb mik_edu
```

Либо через psql:

```sql
CREATE DATABASE mik_edu;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Отредактируйте `.env`:

- `PORT=3001` — порт API
- `JWT_SECRET` — произвольная длинная строка для подписи токенов
- `DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/mik_edu` — строка подключения к БД
- `UPLOAD_DIR=./uploads` — каталог загрузки файлов лекций

Установка зависимостей и инициализация БД:

```bash
npm install
npm run init-db
```

Запуск сервера:

```bash
npm run dev
```

По умолчанию после `init-db` создаётся пользователь **admin** с паролем **admin** (обязательно смените в продакшене).

### 3. Frontend

В отдельном терминале:

```bash
cd frontend
npm install
npm run dev
```

Откройте в браузере: **http://localhost:5173/** (порт задаётся в `frontend/vite.config.js`; прокси `/api` идёт на backend `:8000`)

Логин по умолчанию: **admin** / **admin**.

---

## Развёртывание на веб-хосте

**Docker на сервере (порты, команды):** см. **[SERVER.md](./SERVER.md)**.  
Полная инструкция по переменным и без Docker: **[DEPLOY.md](./DEPLOY.md)**.

### Общие шаги

1. **База данных:** на хосте должен быть PostgreSQL (или сервис БД у провайдера). Создайте базу и сохраните `DATABASE_URL`.
2. **Node.js:** хостинг должен поддерживать Node.js (например, VPS, Heroku, Railway, Render, Vercel + отдельный backend).

### Backend на VPS / облаке (Node)

- Установите Node.js и PostgreSQL.
- Склонируйте/загрузите проект, в каталоге `backend`:
  - задайте переменные окружения: `PORT`, `JWT_SECRET`, `DATABASE_URL`, `UPLOAD_DIR`;
  - выполните `npm install`, `npm run init-db`, затем запуск: `node server.js` или через PM2/systemd.
- Каталог `uploads` должен существовать и быть доступен для записи (для загружаемых лекций).

### Frontend (статика)

Соберите статику:

```bash
cd frontend
npm install
npm run build
```

В `frontend/.env.production` (или в настройках сборки) укажите URL API, например:

```env
VITE_API_URL=https://your-api-domain.com
```

Если фронт и API на одном домене (прокси), можно оставить относительный путь `/api` и настроить прокси на хосте.

- Залейте содержимое каталога `frontend/dist` в корень сайта или в подкаталог (Nginx/Apache отдают статику из этой папки).
- Либо разверните `dist` на Vercel, Netlify, GitHub Pages и пр., указав правильный API URL.

### Nginx (пример прокси на API)

Если фронт и бэкенд на одном сервере:

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /path/to/frontend/dist;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
  location /api {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### Переменные окружения (продакшен)

- `JWT_SECRET` — длинная случайная строка.
- `DATABASE_URL` — строка подключения к PostgreSQL.
- `PORT` — порт, на котором слушает backend (например, 3001).
- `UPLOAD_DIR` — абсолютный путь к каталогу загрузок (желательно вне публичной зоны).

---

## Структура проекта

```
mik_edu/
├── backend/
│   ├── config/       # подключение к БД
│   ├── middleware/   # auth, adminOnly
│   ├── routes/       # auth, users, groups, subjects, modules, lectures, grades, materials, files
│   ├── scripts/
│   │   └── initDb.js # создание таблиц и пользователя admin
│   ├── uploads/      # загруженные файлы лекций (создаётся при первой загрузке)
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── admin/  # страницы админки
│   │   │   ├── Login.jsx, Dashboard.jsx, Materials.jsx, LectureView.jsx, Grades.jsx
│   │   ├── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
└── README.md
```

## API (кратко)

- `POST /api/auth/login` — вход (логин, пароль), возвращает JWT и данные пользователя.
- `GET /api/auth/me` — текущий пользователь (заголовок `Authorization: Bearer <token>`).
- `GET /api/materials/tree?groupId=` — дерево материалов группы (для студента группа берётся из профиля).
- `GET /api/files/lecture/:id?token=` — файл лекции (PDF/MD/DOCX).
- Админ: `/api/groups`, `/api/subjects`, `/api/modules`, `/api/lectures` (CRUD), `/api/users`, `/api/grades`.

Успешной работы с платформой МИК-ОБРАЗОВАНИЕ.
