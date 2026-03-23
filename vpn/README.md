# OpenVPN для выхода ИИ в интернет

Контейнер **gluetun** поднимает клиент OpenVPN; **backend** использует сетевой стек gluetun (`network_mode: service:gluetun`), поэтому запросы к **Groq** (`api.groq.com`, ключ из [console.groq.com](https://console.groq.com)) идут через VPN (например, на ваш сервер в другой стране).

## Что положить сюда

- **`client.ovpn`** — конфиг клиента OpenVPN, выданный вашим сервером или провайдером VPN.

При необходимости добавьте в конфиг строки:

```text
auth-user-pass /gluetun/auth.txt
```

и создайте **`auth.txt`** (две строки: логин и пароль).

> Не коммитьте `client.ovpn` и `auth.txt` в git.

## Запуск

Из корня проекта:

```bash
docker compose -f docker-compose.yml -f docker-compose.vpn.yml up -d --build
```

Проверка: `curl -s http://localhost:8000/health` — затем в UI сгенерируйте вопросы теста с ИИ.

## Без VPN (как раньше)

```bash
docker compose up -d --build
```

## Только HTTP-прокси (без OpenVPN в Docker)

Если VPN уже поднят на хосте или у вас есть HTTP(S)-прокси в Германии, можно не использовать `docker-compose.vpn.yml`, а в `.env` указать:

```env
HTTPS_PROXY=http://user:pass@хост-прокси:порт
```

Тогда только исходящие HTTPS-запросы Node пойдут через прокси (см. `DEPLOY.md`).
