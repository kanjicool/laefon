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
        path, _, version = fr["src"].partition("?v=")
        assert (out / path).is_file() and version


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


def test_radar_motion_aligns_with_frames(out):
    r = json.loads((out / "latest" / "radar.json").read_text(encoding="utf-8"))
    assert r["schema_version"] == 2 and r["site"]["rings_km"]
    assert r["tracks"], "the default event has moving cells"
    for t in r["tracks"]:
        assert len(t["path"]) == len(r["frames"])
    assert all("outline" in fr for fr in r["frames"])
    assert [b["dbz"] for b in r["scale"]] == sorted(b["dbz"] for b in r["scale"])


def test_now_step_agrees_with_observed_radar(out):
    """The 'now' step must not say dry where the radar shows rain at the same time."""
    from laefon_pipeline.mock.generate import DEFAULT_RUN_T, SCENARIOS, Event, load_areas

    f = json.loads((out / "latest" / "forecast.json").read_text(encoding="utf-8"))
    p_now = {a["area_code"]: a["steps"][0]["p_rain"] for a in f["areas"]}
    obs = Event(SCENARIOS[0]).truth(DEFAULT_RUN_T)
    for a in load_areas()[1]:
        wet = float((obs[a["idx"]] >= 1.0).mean())
        assert p_now[a["area_code"]] >= wet * 0.9, a["name_th"]
