# laefon pipeline

ตอนนี้มีแค่ mock generator ที่สร้างข้อมูลจำลองครบชุดให้ backend อ่าน ต่อไปจะเพิ่มการอ่านข้อมูลเรดาร์จริง baseline และ U-Net

```bash
uv sync
uv run python -m laefon_pipeline.mock --out ../data/generated
uv run pytest
```

`reference/songkhla-tambon.geojson` สร้างจาก OCHA COD-AB (HDX, CC BY-IGO) ด้วย `uv run scripts/build_reference.py <tha_admin_boundaries.gdb>`
