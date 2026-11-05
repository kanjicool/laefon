from fastapi import APIRouter

from ...core.contract import ForecastFile, RadarFile, ReplayIndex
from ...core.store import read_json, safe_id

router = APIRouter(prefix="/v1/replay", tags=["Replay"])


@router.get("/events", summary="รายการเหตุการณ์ฝนที่ย้อนดูได้")
def list_events() -> ReplayIndex:
    return ReplayIndex.model_validate(read_json("replay", "index.json"))


@router.get("/events/{event_id}/runs/{run_id}/forecast", summary="ผลทำนายของรอบหนึ่งในเหตุการณ์")
def run_forecast(event_id: str, run_id: str) -> ForecastFile:
    return ForecastFile.model_validate(
        read_json("replay", safe_id(event_id), safe_id(run_id), "forecast.json")
    )


@router.get("/events/{event_id}/runs/{run_id}/radar", summary="ภาพเรดาร์ของรอบหนึ่งในเหตุการณ์")
def run_radar(event_id: str, run_id: str) -> RadarFile:
    return RadarFile.model_validate(
        read_json("replay", safe_id(event_id), safe_id(run_id), "radar.json")
    )
