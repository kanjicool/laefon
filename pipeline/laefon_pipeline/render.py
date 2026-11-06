"""Radar image rendering shared by the mock and (later) the real pipeline."""

from pathlib import Path

import numpy as np
from contourpy import contour_generator
from PIL import Image
from shapely.geometry import LineString

# Sathing Phra radar legend (weather.tmd.go.th stp240), sampled from the image.
# (min dBZ, hex). Below the first entry is transparent.
TMD_SCALE: list[tuple[float, str]] = [
    (14.0, "#00bd00"),
    (16.5, "#00cb00"),
    (21.5, "#00d046"),
    (24.0, "#00e500"),
    (26.5, "#00f400"),
    (29.0, "#f7f700"),
    (31.5, "#e0e100"),
    (34.0, "#d8d700"),
    (36.5, "#ffc801"),
    (39.0, "#ef9f00"),
    (41.5, "#e19600"),
    (44.0, "#ff5500"),
    (46.5, "#f00000"),
    (49.0, "#e5005b"),
    (51.5, "#d40054"),
    (54.0, "#cf0053"),
    (56.5, "#ff00fe"),
    (59.0, "#fe80fe"),
    (61.5, "#ffc8ff"),
    (64.0, "#ffe0ff"),
    (66.5, "#ffffff"),
]

# Rain area outline for onion skin, in mm/h (~23 dBZ, same as p_rain threshold).
OUTLINE_MMH = 1.0
UPSAMPLE = 4
EDGE_DB = 6.0


def to_dbz(rate: np.ndarray) -> np.ndarray:
    """Marshall-Palmer Z = 200 R^1.6. Zero rain -> -inf."""
    with np.errstate(divide="ignore"):
        return 10 * np.log10(200 * np.power(np.maximum(rate, 0), 1.6))


def _rgb(hex_color: str) -> tuple[int, int, int]:
    return tuple(int(hex_color[i : i + 2], 16) for i in (1, 3, 5))  # type: ignore[return-value]


def upsample(rate: np.ndarray, factor: int = UPSAMPLE) -> np.ndarray:
    h, w = rate.shape
    img = Image.fromarray(rate.astype(np.float32), "F")
    return np.maximum(np.asarray(img.resize((w * factor, h * factor), Image.BICUBIC)), 0)


def render_png(rate: np.ndarray, path: Path) -> None:
    """Upsample before coloring so band edges are smooth instead of 1 km blocks."""
    dbz = to_dbz(upsample(rate))
    rgba = np.zeros((*dbz.shape, 4), dtype=np.uint8)
    # Soft edge (like Windy): the lowest color fades out over EDGE_DB below its threshold.
    first, first_color = TMD_SCALE[0]
    fade = np.clip((dbz - (first - EDGE_DB)) / EDGE_DB, 0, 1)
    rgba[fade > 0] = (*_rgb(first_color), 0)
    rgba[..., 3] = (fade * 255).astype(np.uint8)
    for thr, color in TMD_SCALE:
        rgba[dbz >= thr, :3] = _rgb(color)
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(path, optimize=True)


def _blur(a: np.ndarray, passes: int = 3) -> np.ndarray:
    for _ in range(passes):
        a = (a + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 5
    return a


def outline(rate: np.ndarray, lon: np.ndarray, lat: np.ndarray) -> list[list[list[float]]]:
    """Rain area boundary as lines of [lon, lat]. Smoothed so it shows cluster shape."""
    gen = contour_generator(lon, lat, _blur(rate))
    out = []
    for line in gen.lines(OUTLINE_MMH):
        if len(line) < 8:
            continue
        simple = LineString(line).simplify(0.003)
        out.append([[round(x, 3), round(y, 3)] for x, y in simple.coords])
    return out
