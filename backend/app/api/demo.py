"""Демо-эндпоинты. Подключаются только при `DEMO_MODE=true`, иначе маршрутов нет (404)."""

from fastapi import APIRouter

from app.api.deps import SessionDep
from app.schemas import SeatsOut, TakeSeatsIn
from app.services import demo as demo_service

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/take-seats", response_model=SeatsOut)
async def take_seats(payload: TakeSeatsIn, session: SessionDep) -> SeatsOut:
    """Имитация покупки другим пользователем: занять заданное число мест."""
    event = await demo_service.take_seats(session, payload.count)
    return SeatsOut(seats_available=event.seats_available, total_seats=event.total_seats)


@router.post("/reset", response_model=SeatsOut)
async def reset(session: SessionDep) -> SeatsOut:
    """Вернуть мероприятие в исходное состояние: все места свободны, заказы удалены."""
    event = await demo_service.reset(session)
    return SeatsOut(seats_available=event.seats_available, total_seats=event.total_seats)
