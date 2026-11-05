import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from apiapp.core.clock import live_shift
from apiapp.core.config import get_settings

ISSUED = "2026-11-20T14:30:00+07:00"

FORECAST = {
    "schema_version": 2,
    "is_mock": True,
    "issued_at": ISSUED,
    "step_minutes": 15,
    "model": {"id": "mock", "name_th": "ข้อมูลจำลอง", "version": "0"},
    "areas": [
        {
            "area_code": "TH900101",
            "name_th": "บ่อยาง",
            "district_th": "เมืองสงขลา",
            "steps": [{"lead_min": 15, "p_rain": 0.8, "p_heavy": 0.2}],
        }
    ],
}
RADAR = {
    "schema_version": 1,
    "is_mock": True,
    "coordinates": [[100, 8], [101, 8], [101, 6], [100, 6]],
    "frames": [{"time": ISSUED, "kind": "observed", "src": "latest/frames/0.png"}],
}


def _write(root: Path, rel: str, data: object) -> None:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


@pytest.fixture
def client(tmp_path, monkeypatch):
    _write(tmp_path, "latest/forecast.json", FORECAST)
    _write(tmp_path, "latest/radar.json", RADAR)
    _write(tmp_path, "replay/storm-a/1430/forecast.json", {**FORECAST, "is_mock": True})
    _write(tmp_path, "areas.geojson", {"type": "FeatureCollection", "features": []})
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.setenv("MOCK_LIVE_CLOCK", "false")
    get_settings.cache_clear()
    from apiapp.main import create_app

    yield TestClient(create_app())
    get_settings.cache_clear()


def test_health_reports_data_ready(client):
    assert client.get("/v1/health").json() == {"status": "ok", "data_ready": True}


def test_latest_forecast_matches_contract(client):
    body = client.get("/v1/forecast/latest").json()
    assert body["schema_version"] == 2
    assert body["areas"][0]["area_code"] == "TH900101"


def test_replay_run_forecast(client):
    assert client.get("/v1/replay/events/storm-a/runs/1430/forecast").status_code == 200


@pytest.mark.parametrize("bad", ["..", "Storm", "a b", "..%2F..%2Fetc"])
def test_replay_rejects_unsafe_ids(client, bad):
    assert client.get(f"/v1/replay/events/{bad}/runs/1430/forecast").status_code == 404


def test_missing_file_is_404(client):
    assert client.get("/v1/metrics").status_code == 404


def test_live_shift_moves_issued_to_current_step():
    issued = datetime.fromisoformat(ISSUED)
    now = datetime(2026, 12, 1, 9, 52, tzinfo=UTC)  # 16:52 Bangkok -> 16:45 step
    shifted = issued + live_shift(issued, 15, now)
    assert shifted.astimezone(UTC) == datetime(2026, 12, 1, 9, 45, tzinfo=UTC)
    assert live_shift(shifted, 15, now) == timedelta(0)
