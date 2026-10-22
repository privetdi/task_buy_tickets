"""Доменные ошибки и единый формат ответа: `{code, message, fields?, seats_available?}`."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorField(BaseModel):
    field: str
    message: str


class ErrorResponse(BaseModel):
    code: str
    message: str
    fields: list[ErrorField] | None = None
    seats_available: int | None = None


class DomainError(Exception):
    status_code = 400
    code = "error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message

    def to_response(self) -> ErrorResponse:
        return ErrorResponse(code=self.code, message=self.message)


class EventNotFoundError(DomainError):
    status_code = 404
    code = "event_not_found"


class ChildRequiresAdultError(DomainError):
    status_code = 422
    code = "child_requires_adult"


class NotEnoughSeatsError(DomainError):
    status_code = 409
    code = "not_enough_seats"

    def __init__(self, message: str, seats_available: int) -> None:
        super().__init__(message)
        self.seats_available = seats_available

    def to_response(self) -> ErrorResponse:
        return ErrorResponse(
            code=self.code, message=self.message, seats_available=self.seats_available
        )


async def _handle_domain_error(_: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code, content=exc.to_response().model_dump(exclude_none=True)
    )


async def _handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    # loc выглядит как ("body", "participants", 1, "name"); "body" клиенту не нужен
    fields = [
        ErrorField(
            field=".".join(str(part) for part in error["loc"][1:]) or "body", message=error["msg"]
        )
        for error in exc.errors()
    ]
    response = ErrorResponse(
        code="validation_error", message="Проверьте данные заказа", fields=fields
    )
    return JSONResponse(status_code=422, content=response.model_dump(exclude_none=True))


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, _handle_domain_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
