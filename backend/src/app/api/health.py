from fastapi import APIRouter

from app.models.api import HealthResponse

router = APIRouter()


@router.get("/api/health")
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="3dez-backend")
