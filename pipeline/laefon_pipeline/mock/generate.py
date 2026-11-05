"""Generate a full mock dataset for the backend (see backend/apiapp/core/contract.py).

usage: uv run python -m laefon_pipeline.mock --out ../data/generated

Output:
  areas.geojson
  latest/forecast.json, latest/radar.json
  replay/index.json
  replay/<event>/frames/obs-HHMM.png          observed radar (mock)
  replay/<event>/<run>/forecast.json|radar.json
  replay/<event>/<run>/fc-<lead>.png          forecast radar
  metrics.json                                baseline CSI/POD/FAR on mock data
"""

import argparse
import json
import math
import shutil
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
from PIL import Image
from shapely import contains_xy
from shapely.geometry import shape

from .storms import SCENARIOS, Scenario, rain_rate, texture

REFERENCE = Path(__file__).resolve().parents[2] / "reference" / "songkhla-tambon.geojson"

# ~1 km grid over Songkhla and surrounding sea.
LON0, LON1, LAT0, LAT1, RES = 99.95, 101.35, 6.35, 8.0, 0.01
LONS = np.arange(LON0 + RES / 2, LON1, RES)
LATS = np.arange(LAT1 - RES / 2, LAT0, -RES)  # row 0 = north, matches image rows
GLON, GLAT = np.meshgrid(LONS, LATS)
CORNERS = [[LON0, LAT1], [LON1, LAT1], [LON1, LAT0], [LON0, LAT0]]

STEP = 15
LEADS = list(range(15, 121, STEP))
RUN_TIMES = list(range(60, 181, STEP))  # minutes from event start
DEFAULT_RUN_T = 120
THRESHOLDS = (1.0, 5.0)

RADAR_COLORS = [  # (min mm/h, RGBA)
    (0.5, (169, 211, 239, 170)),
    (2.0, (95, 168, 224, 200)),
    (5.0, (47, 111, 176, 215)),
    (10.0, (75, 63, 163, 225)),
    (20.0, (142, 59, 168, 235)),
]

MODEL = {"id": "mock", "name_th": "ข้อมูลจำลอง (ยังไม่ใช่โมเดลจริง)", "version": "0.1.0"}


def to_png(rate: np.ndarray, path: Path) -> None:
    rgba = np.zeros((*rate.shape, 4), dtype=np.uint8)
    for thr, color in RADAR_COLORS:
        rgba[rate >= thr] = color
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(path, optimize=True)


def load_areas() -> tuple[dict, list[dict]]:
    gj = json.loads(REFERENCE.read_text(encoding="utf-8"))
    areas = []
    for feat in gj["features"]:
        geom = shape(feat["geometry"])
        mask = contains_xy(geom, GLON, GLAT)
        idx = np.argwhere(mask)
        if len(idx) == 0:  # tambon smaller than a cell: use nearest cell
            p = geom.representative_point()
            idx = np.array([[int((LAT1 - p.y) / RES), int((p.x - LON0) / RES)]])
        areas.append({**feat["properties"], "idx": (idx[:, 0], idx[:, 1])})
    return gj, areas


def prob(rate: np.ndarray, thr: float, lead: int) -> np.ndarray:
    """Rain rate -> probability; uncertainty grows with lead time."""
    s = 0.3 + 0.06 * lead / STEP
    return 1 / (1 + np.exp(-(np.log(rate + 0.05) - math.log(thr)) / s))


class Event:
    def __init__(self, sc: Scenario):
        self.sc = sc
        self.start = datetime.fromisoformat(sc.start_iso)
        self.tex = texture(GLON.shape, sc.texture_seed)

    def at(self, t: float) -> datetime:
        return self.start + timedelta(minutes=t)

    def truth(self, t: float) -> np.ndarray:
        return rain_rate(self.sc.cells, GLON, GLAT, t) * self.tex

    def unet(self, t_run: float, lead: int) -> np.ndarray:
        """Knows growth/decay, but position and intensity errors grow with lead."""
        rng = np.random.default_rng([self.sc.texture_seed, int(t_run), lead])
        k = lead / STEP
        pos = 0.008 * k**0.8
        jitter = [
            (rng.normal(0, pos), rng.normal(0, pos), rng.lognormal(0, 0.1 * k))
            for _ in self.sc.cells
        ]
        # No texture: forecasts are smoother than observations.
        return rain_rate(self.sc.cells, GLON, GLAT, t_run + lead, jitter=jitter)

    def optical_flow(self, t_run: float, lead: int) -> np.ndarray:
        """Advect with the observed motion, keep intensity frozen."""
        return rain_rate(self.sc.cells, GLON, GLAT, t_run + lead, frozen_at=t_run)


def hhmm(dt: datetime) -> str:
    return dt.strftime("%H%M")


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def build_run(ev: Event, t_run: int, areas: list[dict], out: Path) -> tuple[dict, dict]:
    sc = ev.sc
    run_id = hhmm(ev.at(t_run))
    run_dir = out / "replay" / sc.id / run_id
    per_area = {a["area_code"]: [] for a in areas}
    frames = []
    for t in range(t_run - 60, t_run + 1, STEP):
        name = f"replay/{sc.id}/frames/obs-{hhmm(ev.at(t))}.png"
        frames.append({"time": ev.at(t).isoformat(), "kind": "observed", "src": name})
    for lead in LEADS:
        pred = ev.unet(t_run, lead)
        to_png(pred, run_dir / f"fc-{lead}.png")
        frames.append(
            {
                "time": ev.at(t_run + lead).isoformat(),
                "kind": "forecast",
                "src": f"replay/{sc.id}/{run_id}/fc-{lead}.png",
            }
        )
        p1, p5 = prob(pred, 1.0, lead), prob(pred, 5.0, lead)
        for a in areas:
            per_area[a["area_code"]].append(
                {
                    "lead_min": lead,
                    "p_rain": round(float(p1[a["idx"]].mean()), 3),
                    "p_heavy": round(float(p5[a["idx"]].mean()), 3),
                }
            )
    forecast = {
        "schema_version": 2,
        "is_mock": True,
        "issued_at": ev.at(t_run).isoformat(),
        "step_minutes": STEP,
        "model": MODEL,
        "areas": [
            {
                "area_code": a["area_code"],
                "name_th": a["name_th"],
                "district_th": a["district_th"],
                "steps": per_area[a["area_code"]],
            }
            for a in areas
        ],
    }
    radar = {"schema_version": 1, "is_mock": True, "coordinates": CORNERS, "frames": frames}
    write_json(run_dir / "forecast.json", forecast)
    write_json(run_dir / "radar.json", radar)
    return forecast, radar


def contingency(truth: np.ndarray, pred: np.ndarray, thr: float) -> np.ndarray:
    o, f = truth >= thr, pred >= thr
    return np.array([(o & f).sum(), (o & ~f).sum(), (~o & f).sum()], dtype=float)


def metrics(events: list[Event]) -> dict:
    """Baselines only: the mock predictor is accurate by construction."""
    methods = {
        "optical_flow": ("Optical flow", lambda ev, t, L: ev.optical_flow(t, L)),
        "persistence": ("Persistence", lambda ev, t, L: ev.truth(t)),
    }
    models = []
    for mid, (name, fn) in methods.items():
        rows = []
        for thr in THRESHOLDS:
            for lead in LEADS:
                hits, misses, fas = sum(
                    contingency(ev.truth(t + lead), fn(ev, t, lead), thr)
                    for ev in events
                    for t in RUN_TIMES
                )
                rows.append(
                    {
                        "lead_min": lead,
                        "threshold_mmh": thr,
                        "csi": round(hits / max(hits + misses + fas, 1), 3),
                        "pod": round(hits / max(hits + misses, 1), 3),
                        "far": round(fas / max(hits + fas, 1), 3),
                    }
                )
        models.append({"id": mid, "name_th": name, "by_lead": rows})
    return {
        "schema_version": 1,
        "is_mock": True,
        "test_period_th": f"ข้อมูลจำลอง {len(events)} เหตุการณ์ · {len(RUN_TIMES)} รอบต่อเหตุการณ์",
        "models": models,
    }


def generate(out: Path) -> None:
    # Clear contents, not the dir itself: it may be a volume mount.
    out.mkdir(parents=True, exist_ok=True)
    for child in out.iterdir():
        shutil.rmtree(child) if child.is_dir() else child.unlink()
    gj, areas = load_areas()
    write_json(out / "areas.geojson", gj)

    events = [Event(sc) for sc in SCENARIOS]
    index = []
    for ev in events:
        for t in range(0, max(RUN_TIMES) + 1, STEP):
            to_png(ev.truth(t), out / "replay" / ev.sc.id / "frames" / f"obs-{hhmm(ev.at(t))}.png")
        runs = []
        for t_run in RUN_TIMES:
            forecast, radar = build_run(ev, t_run, areas, out)
            runs.append(hhmm(ev.at(t_run)))
            if ev.sc is SCENARIOS[0] and t_run == DEFAULT_RUN_T:
                write_json(out / "latest" / "forecast.json", forecast)
                write_json(out / "latest" / "radar.json", radar)
        index.append(
            {
                "id": ev.sc.id,
                "title_th": ev.sc.title_th,
                "description_th": ev.sc.description_th,
                "runs": runs,
                "default_run": hhmm(ev.at(DEFAULT_RUN_T)),
            }
        )
    replay_index = {"schema_version": 1, "is_mock": True, "events": index}
    write_json(out / "replay" / "index.json", replay_index)
    write_json(out / "metrics.json", metrics(events))
    n_png = sum(1 for _ in out.rglob("*.png"))
    print(f"เขียนข้อมูลจำลองที่ {out}: {len(areas)} ตำบล, {len(events)} เหตุการณ์, {n_png} ภาพ")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, required=True)
    generate(parser.parse_args().out)


if __name__ == "__main__":
    main()
