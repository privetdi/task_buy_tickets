from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import demo, events, health, orders
from app.config import Settings, get_settings
from app.db.seed import seed_event
from app.db.session import create_engine, create_session_factory, init_db
from app.errors import register_exception_handlers


def create_app(settings: Settings | None = None) -> FastAPI:
    """Собирает приложение. Запуск: `uvicorn app.main:create_app --factory`."""
    settings = settings or get_settings()
    # Движок создаётся лениво: к БД обращаемся только в lifespan и в запросах
    engine = create_engine(settings.database_url)
    session_factory = create_session_factory(engine)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        await init_db(engine)
        await seed_event(session_factory, settings.event_total_seats)
        yield
        await engine.dispose()

    # Вся документация — под префиксом /api: доступна и через прокси фронтенда на одном адресе
    app = FastAPI(
        title="Оформление билетов",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )
    app.state.settings = settings
    app.state.session_factory = session_factory

    register_exception_handlers(app)

    if settings.cors_origins_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins_list,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(health.router, prefix="/api")
    app.include_router(events.router, prefix="/api")
    app.include_router(orders.router, prefix="/api")
    if settings.demo_mode:
        app.include_router(demo.router, prefix="/api")
    return app
