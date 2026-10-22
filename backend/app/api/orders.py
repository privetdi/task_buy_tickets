from fastapi import APIRouter, status

from app.api.deps import SessionDep
from app.errors import ErrorResponse
from app.schemas import OrderCreate, OrderOut
from app.services import orders as orders_service

router = APIRouter(tags=["orders"])


@router.post(
    "/orders",
    response_model=OrderOut,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"model": ErrorResponse, "description": "Не хватает свободных мест"},
        422: {"model": ErrorResponse, "description": "Заказ не прошёл проверку"},
    },
)
async def create_order(payload: OrderCreate, session: SessionDep) -> OrderOut:
    """Подтверждение заказа: проверка правил, списание мест, сохранение."""
    order = await orders_service.create_order(session, payload)
    return OrderOut.model_validate(order)
