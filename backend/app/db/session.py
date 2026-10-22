from pathlib import Path

from sqlalchemy import event
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.db.models import Base

# Сколько секунд конкурирующая запись ждёт освобождения блокировки SQLite, а не падает
SQLITE_BUSY_TIMEOUT_SECONDS = 30


def create_engine(database_url: str) -> AsyncEngine:
    url = make_url(database_url)
    if url.get_backend_name() != "sqlite":
        return create_async_engine(database_url)

    # Каталог для файла БД создаётся автоматически
    if url.database and url.database != ":memory:":
        Path(url.database).parent.mkdir(parents=True, exist_ok=True)

    engine = create_async_engine(
        database_url, connect_args={"timeout": SQLITE_BUSY_TIMEOUT_SECONDS}
    )

    @event.listens_for(engine.sync_engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _record) -> None:
        # В SQLite внешние ключи по умолчанию не проверяются
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    # expire_on_commit=False: после коммита объекты остаются читаемыми без повторной загрузки
    return async_sessionmaker(engine, expire_on_commit=False)


async def init_db(engine: AsyncEngine) -> None:
    """Создаёт таблицы, если их ещё нет. Миграций в проекте нет — см. README."""
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
