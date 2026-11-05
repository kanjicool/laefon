# /// script
# requires-python = ">=3.12"
# dependencies = ["geopandas>=1.2", "pyogrio>=0.11"]
# ///
"""สร้าง reference/songkhla-tambon.geojson จาก Thailand admin boundaries (OCHA COD-AB บน HDX)

ดาวน์โหลด tha_admin_boundaries.gdb.zip จาก https://data.humdata.org/dataset/cod-ab-tha แล้วแตกไฟล์
usage: uv run scripts/build_reference.py <path/to/tha_admin_boundaries.gdb> [out.geojson]
license: CC BY-IGO — ต้องใส่เครดิต OCHA บนเว็บ
"""

import sys
from pathlib import Path

import geopandas as gpd
import pyogrio


def pick(cols: list[str], *candidates: str) -> str:
    lower = {c.lower(): c for c in cols}
    for cand in candidates:
        if cand in lower:
            return lower[cand]
    raise SystemExit(f"ไม่เจอคอลัมน์ {candidates} ใน {cols}")


def main() -> None:
    gdb = Path(sys.argv[1])
    default_out = Path(__file__).parent.parent / "reference/songkhla-tambon.geojson"
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else default_out
    layers = [name for name, _ in pyogrio.list_layers(gdb)]
    layer = next(n for n in layers if n.lower().endswith(("adm3", "admin3")))
    df = gpd.read_file(gdb, layer=layer)
    cols = list(df.columns)
    pcode = pick(cols, "adm3_pcode")
    name_th = pick(cols, "adm3_name1", "adm3_th", "adm3_name_th")
    dist_th = pick(cols, "adm2_name1", "adm2_th", "adm2_name_th")
    adm1 = pick(cols, "adm1_pcode")

    sk = df[df[adm1] == "TH90"].to_crs(4326)
    sk = sk.assign(geometry=sk.geometry.simplify(0.0008, preserve_topology=True))
    out_df = gpd.GeoDataFrame(
        {
            "area_code": sk[pcode],
            "name_th": sk[name_th].str.replace(r"^(ตำบล|ต\.)\s*", "", regex=True),
            "district_th": sk[dist_th].str.replace(r"^(อำเภอ|อ\.)\s*", "", regex=True),
        },
        geometry=sk.geometry,
        crs=4326,
    ).sort_values("area_code")
    out.parent.mkdir(parents=True, exist_ok=True)
    out_df.to_file(out, driver="GeoJSON", COORDINATE_PRECISION=5)
    n_dist = out_df["district_th"].nunique()
    print(f"{layer}: {len(out_df)} ตำบล, {n_dist} อำเภอ → {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
