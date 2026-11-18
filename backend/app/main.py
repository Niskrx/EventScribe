from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.health import router as health_router
from app.api.me import router as me_router
from app.config import get_settings
from app.schemas.errors import ErrorResponse


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="EventScribe API",
        version="0.1.0",
        description="Backend API for dynamic academic event report generation.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_, exc: RequestValidationError) -> JSONResponse:
        payload = ErrorResponse(
            error={
                "code": "VALIDATION_ERROR",
                "message": "The request could not be validated.",
                "details": {"fields": exc.errors()},
            }
        )
        return JSONResponse(status_code=422, content=payload.model_dump())

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_, exc: StarletteHTTPException) -> JSONResponse:
        payload = ErrorResponse(
            error={
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
                "details": {},
            }
        )
        return JSONResponse(status_code=exc.status_code, content=payload.model_dump())

    app.include_router(health_router)
    app.include_router(me_router)
    return app


app = create_app()
