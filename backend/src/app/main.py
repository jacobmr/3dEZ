from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.conversations import router as conversations_router
from app.api.designs import router as designs_router
from app.api.generate import router as generate_router
from app.api.health import router as health_router
from app.api.photos import router as photos_router
from app.api.stl_files import router as stl_files_router
from app.api.usage import router as usage_router
from app.db.engine import create_tables


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

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(conversations_router)
app.include_router(designs_router)
app.include_router(generate_router)
app.include_router(photos_router)
app.include_router(stl_files_router)
app.include_router(usage_router)
