import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.auth import router as auth_router
from app.api.conversations import router as conversations_router
from app.api.designs import router as designs_router
from app.api.generate import router as generate_router
from app.api.health import router as health_router
from app.api.photos import router as photos_router
from app.api.shared import router as shared_router
from app.api.stl_files import router as stl_files_router
from app.api.usage import router as usage_router
from app.db.engine import create_tables

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle hook."""
    await create_tables()
    # Ensure storage directories exist
    Path("data/photos").mkdir(parents=True, exist_ok=True)
    Path("data/stl").mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="3dEZ Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handlers — consistent error format
# ---------------------------------------------------------------------------

# Map status codes to user-friendly error codes
_ERROR_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    413: "payload_too_large",
    422: "validation_error",
    429: "rate_limited",
    500: "internal_error",
    503: "service_unavailable",
}


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    """Return HTTPExceptions in the standard {error, message, details} format."""
    code = _ERROR_CODES.get(exc.status_code, "error")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": code,
            "message": str(exc.detail) if exc.detail else "An error occurred",
            "details": None,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    _request: Request, exc: Exception,
) -> JSONResponse:
    """Catch unhandled exceptions and return a safe 500 response."""
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": "Something went wrong. Please try again.",
            "details": None,
        },
    )

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(conversations_router)
app.include_router(designs_router)
app.include_router(generate_router)
app.include_router(photos_router)
app.include_router(shared_router)
app.include_router(stl_files_router)
app.include_router(usage_router)
