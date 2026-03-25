#!/bin/sh
# Ждём, пока API ответит, затем nginx резолвит имя backend при старте воркеров.
set -eu
echo "[mik-edu-frontend] Ожидание http://backend:8000/health ..."
n=0
max=90
while [ "$n" -lt "$max" ]; do
  if curl -fsS "http://backend:8000/health" >/dev/null 2>&1; then
    echo "[mik-edu-frontend] backend готов, запуск nginx"
    exec nginx -g "daemon off;"
  fi
  n=$((n + 1))
  sleep 1
done
echo "[mik-edu-frontend] Таймаут: backend не ответил за ${max} с" >&2
exit 1
