import json

import pytest

from laefon_pipeline.mock.generate import LEADS, generate


@pytest.fixture(scope="module")
def out(tmp_path_factory):
    path = tmp_path_factory.mktemp("generated")
    generate(path)
    return path


def test_latest_forecast_follows_contract(out):
    f = json.loads((out / "latest" / "forecast.json").read_text(encoding="utf-8"))
    assert f["schema_version"] == 2 and f["is_mock"] is True
    assert len(f["areas"]) == 127
    for area in f["areas"]:
        assert [s["lead_min"] for s in area["steps"]] == LEADS
        for s in area["steps"]:
            assert 0 <= s["p_heavy"] <= 1 and 0 <= s["p_rain"] <= 1


def test_radar_frames_exist_on_disk(out):
    r = json.loads((out / "latest" / "radar.json").read_text(encoding="utf-8"))
    kinds = [fr["kind"] for fr in r["frames"]]
    assert kinds.count("observed") == 5 and kinds.count("forecast") == len(LEADS)
    for fr in r["frames"]:
        assert (out / fr["src"]).is_file()


def test_replay_runs_have_files(out):
    index = json.loads((out / "replay" / "index.json").read_text(encoding="utf-8"))
    assert len(index["events"]) == 3
    for ev in index["events"]:
        assert ev["default_run"] in ev["runs"]
        for run in ev["runs"]:
            assert (out / "replay" / ev["id"] / run / "forecast.json").is_file()


def test_generation_is_deterministic(out, tmp_path):
    generate(tmp_path)
    a = (out / "latest" / "forecast.json").read_bytes()
    assert a == (tmp_path / "latest" / "forecast.json").read_bytes()
