from fastapi import APIRouter

router = APIRouter(tags=["service"])


@router.get("/health")
async def health() -> dict[str, str]:
    """Проверка живости сервиса (используется healthcheck в Docker Compose)."""
    return {"status": "ok"}
