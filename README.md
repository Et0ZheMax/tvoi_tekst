# Tvoi Tekst

MVP веб-мессенджер (Telegram-like) с заделом на мобильные клиенты. Архитектура разделяет backend API и frontend web app.

## Структура репозитория

```
apps/
  api/        # Fastify + Prisma + Socket.IO
  web/        # Next.js UI
```

## Стек и ключевые решения

- **Backend:** Fastify + TypeScript — быстрый, модульный, безопасный.
- **Realtime:** Socket.IO — удобная аутентификация, комнаты, reconnection.
- **DB:** PostgreSQL + Prisma.
- **Cache/Presence:** Redis (подготовлено в docker-compose, можно подключить позже).
- **Frontend:** Next.js (App Router) + TypeScript.
- **Безопасность:** JWT access/refresh, httpOnly cookies, rate limiting, helmet.

## Запуск локально

### 1) Инфраструктура

```bash
docker-compose up
```

### 2) Переменные окружения

Создайте `.env` в корне на базе `.env.example`.

### 3) Установка зависимостей

```bash
npm install
```

### 4) Миграции Prisma

```bash
npm run prisma:generate --workspace apps/api
npm run prisma:migrate --workspace apps/api
```

### 5) Запуск dev

```bash
npm run dev
```

Web: http://localhost:7001
API: http://localhost:7777

## MVP функционал

- Auth: регистрация/логин/refresh/logout/me
- Чаты: личные диалоги 1:1, поиск, список
- Сообщения: отправка, получение, пагинация, редактирование/удаление/прочитано
- Realtime: новые сообщения, typing, presence
- Healthcheck: `/health`

## Архитектура и безопасность

- **Пароли:** Argon2.
- **Access token:** short-lived JWT.
- **Refresh token:** JWT в HttpOnly cookie + хэш в БД.
- **Много устройств:** отдельные `Session` записи.
- **Rate limiting:** Fastify rate-limit.
- **CORS:** `CORS_ORIGIN`.
- **Security headers:** `@fastify/helmet`.
- **TLS:** предполагается на уровне reverse-proxy (Caddy/Nginx).

## Тесты

```bash
npm run test --workspace apps/api
```

## Roadmap (не в MVP)

- Группы, реакции, пересылка, закреп
- Уведомления, пуши
- Хранилище файлов (S3-compatible)
- E2E шифрование (с отдельным протоколом и ключами на клиентах)
