# Оформление билетов

Приложение для покупки билетов на мероприятие: бэкенд на FastAPI, фронтенд на React и TypeScript. Данные мероприятия моковые.

## Запуск

### Docker Compose (быстрый старт)

Нужен Docker с Compose. Из корня репозитория:

```bash
docker compose up --build
```

- Приложение: http://localhost:8080
- Документация API: http://localhost:8080/api/docs

Порт меняется переменной окружения: `WEB_PORT=9090 docker compose up --build`. Остановка: `docker compose down` (данные сохраняются), `docker compose down -v` удаляет и данные.

### Без Docker

**Бэкенд** (Python 3.12+), из корня репозитория:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:create_app --factory --reload
```

API будет на http://localhost:8000 (если порт занят, добавьте `--port <номер>`). База данных (файл SQLite) и моковое мероприятие создаются при первом запуске.

**Фронтенд** (Node.js `^22.14` или `>=24`), в другом терминале:

```bash
cd frontend
npm ci
npm run dev
```

Приложение откроется на http://localhost:5173. Запросы `/api` проксируются на бэкенд `http://localhost:8000`; если он запущен на другом порту: `VITE_API_PROXY=http://localhost:8765 npm run dev`.

## Тесты

```bash
cd backend && pytest        # с активированным окружением
cd frontend && npm test
```

## Использование AI

При разработке использовался AI-ассистент Claude Code.
