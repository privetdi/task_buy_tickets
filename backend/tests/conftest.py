from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.config import Settings
from app.db.session import create_engine, create_session_factory, init_db
from app.main import create_app


@pytest.fixture
def database_url(tmp_path: Path) -> str:
    """Отдельный файл SQLite на каждый тест: настоящая БД, без общего состояния."""
    return f"sqlite+aiosqlite:///{tmp_path / 'test.db'}"


@pytest.fixture
async def engine(database_url: str) -> AsyncIterator[AsyncEngine]:
    engine = create_engine(database_url)
    await init_db(engine)
    yield engine
    await engine.dispose()


@pytest.fixture
def session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return create_session_factory(engine)


@pytest.fixture
def settings(database_url: str) -> Settings:
    # _env_file=None: тесты не зависят от локального .env
    return Settings(_env_file=None, database_url=database_url, demo_mode=True, event_total_seats=10)


@pytest.fixture
async def app(settings: Settings) -> AsyncIterator[FastAPI]:
    app = create_app(settings)
    # ASGITransport сам lifespan не запускает — делаем это явно (создание схемы и seed)
    async with app.router.lifespan_context(app):
        yield app


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
