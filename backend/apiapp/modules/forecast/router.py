from fastapi import APIRouter

from ...core.clock import live_shift
from ...core.config import get_settings
from ...core.contract import ForecastFile, RadarFile
from ...core.store import read_json

router = APIRouter(prefix="/v1", tags=["Forecast"])


def _latest() -> tuple[ForecastFile, RadarFile]:
    forecast = ForecastFile.model_validate(read_json("latest", "forecast.json"))
    radar = RadarFile.model_validate(read_json("latest", "radar.json"))
    if forecast.is_mock and get_settings().MOCK_LIVE_CLOCK:
        shift = live_shift(forecast.issued_at, forecast.step_minutes)
        forecast.issued_at += shift
        for frame in radar.frames:
            frame.time += shift
    return forecast, radar


@router.get("/forecast/latest", summary="ผลทำนายรายตำบลรอบล่าสุด")
def latest_forecast() -> ForecastFile:
    return _latest()[0]


@router.get("/radar/latest", summary="ภาพเรดาร์ย้อนหลัง + ภาพทำนายของรอบล่าสุด")
def latest_radar() -> RadarFile:
    return _latest()[1]
