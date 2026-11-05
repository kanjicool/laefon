"""Data contract: pipeline -> API -> web.

Keep in sync with web/src/lib/features/forecast/domain/types.ts; bump schema_version on change.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ForecastStep(BaseModel):
    lead_min: int = Field(gt=0)
    p_rain: float = Field(ge=0, le=1, description="P(rain >= 1 mm/h)")
    p_heavy: float = Field(ge=0, le=1, description="P(rain >= 5 mm/h)")


class AreaForecast(BaseModel):
    area_code: str
    name_th: str
    district_th: str
    steps: list[ForecastStep]


class ModelInfo(BaseModel):
    id: str
    name_th: str
    version: str


class ForecastFile(BaseModel):
    schema_version: Literal[2]
    is_mock: bool
    issued_at: datetime
    step_minutes: int
    model: ModelInfo
    areas: list[AreaForecast]


class RadarFrame(BaseModel):
    time: datetime
    kind: Literal["observed", "forecast"]
    src: str = Field(description="Path under /v1/files")


class RadarFile(BaseModel):
    schema_version: Literal[1]
    is_mock: bool
    # Image corners [TL, TR, BR, BL] as [lon, lat] (MapLibre image source order).
    coordinates: list[tuple[float, float]] = Field(min_length=4, max_length=4)
    frames: list[RadarFrame]


class ReplayEvent(BaseModel):
    id: str
    title_th: str
    description_th: str
    runs: list[str] = Field(description="Run ids, e.g. 1430")
    default_run: str


class ReplayIndex(BaseModel):
    schema_version: Literal[1]
    is_mock: bool
    events: list[ReplayEvent]


class LeadMetric(BaseModel):
    lead_min: int
    threshold_mmh: float
    csi: float
    pod: float
    far: float


class ModelMetrics(BaseModel):
    id: str
    name_th: str
    by_lead: list[LeadMetric]


class MetricsFile(BaseModel):
    schema_version: Literal[1]
    is_mock: bool
    test_period_th: str
    models: list[ModelMetrics]
