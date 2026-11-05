"""Mock rain field: moving elliptical cells that grow and decay. Not physical, just plausible."""

import math
from dataclasses import dataclass, field

import numpy as np

COSLAT = math.cos(math.radians(7.1))


@dataclass(frozen=True)
class Cell:
    lon: float  # position at t = 0
    lat: float
    u: float  # eastward speed, deg/h
    v: float  # northward speed, deg/h
    peak: float  # peak mm/h
    sx: float  # major-axis sigma, deg
    sy: float  # minor-axis sigma, deg
    angle: float  # major-axis angle
    birth: float = -240.0  # minutes
    life: float = 600.0  # minutes

    def position(self, t: float) -> tuple[float, float]:
        return self.lon + self.u * t / 60, self.lat + self.v * t / 60

    def amplitude(self, t: float) -> float:
        x = (t - self.birth) / self.life
        if x <= 0 or x >= 1:
            return 0.0
        return self.peak * math.sin(math.pi * x) ** 1.5


@dataclass(frozen=True)
class Scenario:
    id: str
    title_th: str
    description_th: str
    start_iso: str  # t = 0, with timezone
    cells: tuple[Cell, ...]
    texture_seed: int = 1
    extra: dict = field(default_factory=dict)


def rain_rate(cells, lon: np.ndarray, lat: np.ndarray, t: float, *, frozen_at=None, jitter=None):
    """Rain rate (mm/h) on the grid at minute t.

    frozen_at: use cell intensity from this time (optical-flow style, no growth/decay).
    jitter: per-cell (dlon, dlat, gain) to simulate model error.
    """
    out = np.zeros_like(lon, dtype=float)
    for i, c in enumerate(cells):
        cx, cy = c.position(t)
        amp = c.amplitude(frozen_at if frozen_at is not None else t)
        if jitter is not None:
            dx, dy, gain = jitter[i]
            cx, cy, amp = cx + dx, cy + dy, amp * gain
        if amp <= 0:
            continue
        a = math.radians(c.angle)
        dxg = (lon - cx) * COSLAT
        dyg = lat - cy
        uu = dxg * math.cos(a) + dyg * math.sin(a)
        vv = -dxg * math.sin(a) + dyg * math.cos(a)
        out += amp * np.exp(-(uu**2 / (2 * c.sx**2) + vv**2 / (2 * c.sy**2)))
    return out


def texture(shape: tuple[int, int], seed: int) -> np.ndarray:
    """Multiplicative texture (0.1-2.0) so radar images are not too smooth."""
    rng = np.random.default_rng(seed)
    noise = rng.normal(size=shape)
    for _ in range(6):  # repeated box blur ~ gaussian
        noise = (
            noise
            + np.roll(noise, 1, 0)
            + np.roll(noise, -1, 0)
            + np.roll(noise, 1, 1)
            + np.roll(noise, -1, 1)
        ) / 5
    noise = (noise - noise.mean()) / (noise.std() + 1e-9)
    return np.clip(1 + 0.6 * noise, 0.1, 2.0)


SCENARIOS: tuple[Scenario, ...] = (
    Scenario(
        id="coast-band",
        title_th="แนวฝนจากอ่าวไทยเข้าเมืองสงขลา",
        description_th="แนวฝนยาวเคลื่อนจากทะเลเข้าฝั่ง ผ่านสิงหนครและเมืองสงขลา แล้วอ่อนลงเมื่อเข้าหาดใหญ่",
        start_iso="2025-12-14T12:00:00+07:00",
        cells=(
            Cell(100.98, 7.62, -0.16, -0.07, 9, 0.05, 0.16, 35, birth=-60, life=420),
            Cell(101.10, 7.40, -0.16, -0.07, 8, 0.045, 0.09, 35, birth=-30, life=360),
            Cell(101.20, 7.05, -0.14, -0.05, 8, 0.04, 0.07, 20, birth=30, life=300),
        ),
        texture_seed=11,
    ),
    Scenario(
        id="hatyai-heavy",
        title_th="ฝนหนักต่อเนื่องหาดใหญ่",
        description_th="กลุ่มฝนขนาดใหญ่ค้างอยู่เหนือหาดใหญ่และบางกล่ำ เคลื่อนช้า มีแกนฝนหนักหลายจุด",
        start_iso="2025-11-25T15:00:00+07:00",
        cells=(
            Cell(100.62, 7.10, -0.04, -0.03, 9, 0.10, 0.14, 50, birth=-200, life=600),
            Cell(100.48, 7.02, -0.03, -0.02, 30, 0.05, 0.07, 10, birth=0, life=240),
            Cell(100.70, 6.95, -0.05, -0.02, 20, 0.05, 0.06, 0, birth=60, life=200),
        ),
        texture_seed=23,
    ),
    Scenario(
        id="afternoon-storms",
        title_th="พายุฝนฟ้าคะนองช่วงบ่าย",
        description_th="กลุ่มฝนเล็กก่อตัวเร็วหลายจุดทางตอนใต้ของจังหวัด แต่ละก้อนอยู่ไม่นาน",
        start_iso="2025-10-08T13:00:00+07:00",
        cells=(
            Cell(100.45, 6.75, 0.03, 0.06, 26, 0.04, 0.05, 0, birth=20, life=150),
            Cell(100.80, 6.70, 0.02, 0.07, 24, 0.035, 0.045, 0, birth=60, life=140),
            Cell(100.95, 6.85, 0.02, 0.05, 20, 0.04, 0.05, 0, birth=100, life=130),
            Cell(100.30, 7.05, 0.04, 0.05, 18, 0.035, 0.04, 0, birth=130, life=120),
        ),
        texture_seed=37,
    ),
)
