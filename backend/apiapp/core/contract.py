"""Data contract: pipeline -> API -> web.

Keep in sync with web/src/lib/features/forecast/domain/types.ts; bump schema_version on change.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


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


LonLat = tuple[float, float]


class RadarFrame(BaseModel):
    time: datetime
    kind: Literal["observed", "forecast"]
    src: str = Field(description="Path under /v1/files, with ?v=<content hash>")
    outline: list[list[LonLat]] = Field(description="Rain area boundary (>= 1 mm/h) lines")


class RadarSite(BaseModel):
    name_th: str
    lon: float
    lat: float
    rings_km: list[int]


class ScaleBand(BaseModel):
    dbz: float = Field(description="Lower bound of this color")
    color: str


class Track(BaseModel):
    id: str
    path: list[LonLat | None] = Field(description="Cell centre per frame, null when absent")


class RadarFile(BaseModel):
    schema_version: Literal[2]
    is_mock: bool
    # Image corners [TL, TR, BR, BL] as [lon, lat] (MapLibre image source order).
    coordinates: list[LonLat] = Field(min_length=4, max_length=4)
    site: RadarSite
    scale: list[ScaleBand]
    frames: list[RadarFrame]
    tracks: list[Track]

    @model_validator(mode="after")
    def _tracks_match_frames(self) -> RadarFile:
        if any(len(t.path) != len(self.frames) for t in self.tracks):
            raise ValueError("track path length must equal frame count")
        return self


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
