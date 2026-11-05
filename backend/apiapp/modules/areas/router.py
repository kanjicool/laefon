from typing import Any

from fastapi import APIRouter

from ...core.store import read_json

router = APIRouter(prefix="/v1/areas", tags=["Areas"])


@router.get("", summary="ขอบเขตตำบล (GeoJSON) — properties: area_code, name_th, district_th")
def areas() -> dict[str, Any]:
    return read_json("areas.geojson")
