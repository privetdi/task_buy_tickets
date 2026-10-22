FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir .

# Файл БД лежит в каталоге /data — в Compose он вынесен в именованный том, данные переживают перезапуск
RUN useradd --system --no-create-home app && mkdir /data && chown app:app /data
ENV DATABASE_URL=sqlite+aiosqlite:////data/tickets.db
USER app

EXPOSE 8000
CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
