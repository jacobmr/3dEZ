from fastapi import APIRouter

router = APIRouter()


@router.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "service": "3dez-backend"}
