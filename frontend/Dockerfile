# Сборка
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Продакшен: nginx слушает порт 80 (не 3000)
FROM nginx:alpine

RUN apk add --no-cache curl \
  && rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY wait-backend.sh /wait-backend.sh
RUN chmod +x /wait-backend.sh

EXPOSE 80

# Дать время wait-backend + старту nginx (start_period > типичного ожидания backend)
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD curl -fsS http://127.0.0.1/ >/dev/null || exit 1

CMD ["/wait-backend.sh"]
