from fastapi import APIRouter

from ...core.contract import MetricsFile
from ...core.store import read_json

router = APIRouter(prefix="/v1/metrics", tags=["Metrics"])


@router.get("", summary="ผลวัดความแม่นยำของโมเดลเทียบ baseline")
def metrics() -> MetricsFile:
    return MetricsFile.model_validate(read_json("metrics.json"))
