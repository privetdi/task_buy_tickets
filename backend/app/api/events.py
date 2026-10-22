from fastapi import APIRouter

from app.api.deps import SessionDep, SettingsDep
from app.errors import ErrorResponse
from app.schemas import EventOut, RulesOut
from app.services import events as events_service

router = APIRouter(tags=["event"])


@router.get(
    "/event",
    response_model=EventOut,
    responses={404: {"model": ErrorResponse}},
)
async def read_event(session: SessionDep, settings: SettingsDep) -> EventOut:
    """Мероприятие, остаток мест и правила продажи."""
    event = await events_service.get_event(session)
    return EventOut(
        id=event.id,
        title=event.title,
        starts_at=event.starts_at,
        venue=event.venue,
        total_seats=event.total_seats,
        seats_available=event.seats_available,
        rules=RulesOut.current(),
        demo_mode=settings.demo_mode,
    )
