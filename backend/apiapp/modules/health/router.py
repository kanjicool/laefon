from fastapi import APIRouter
from pydantic import BaseModel

from ...core.store import data_dir

router = APIRouter(prefix="/v1/health", tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    data_ready: bool


@router.get("", summary="Health check")
def health() -> HealthResponse:
    return HealthResponse(
        status="ok", data_ready=(data_dir() / "latest" / "forecast.json").is_file()
    )
