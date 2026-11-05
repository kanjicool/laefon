# laefon backend (FastAPI)

ส่งผลทำนายฝนรายตำบล ภาพเรดาร์ และผลวัดโมเดลให้เว็บ อ่านไฟล์จาก `DATA_DIR` ที่ pipeline เขียนไว้

```bash
uv sync
DATA_DIR=../data/generated uv run fastapi dev apiapp/main.py --port 9000   # http://localhost:9000/docs
uv run pytest
uv run ruff check . && uv run ruff format --check .
```

| endpoint | อะไร |
|---|---|
| `GET /v1/health` | สถานะ + ข้อมูลพร้อมหรือยัง |
| `GET /v1/forecast/latest` | ผลทำนายรายตำบลรอบล่าสุด |
| `GET /v1/radar/latest` | ภาพเรดาร์ย้อนหลัง + ภาพทำนาย |
| `GET /v1/replay/events` | เหตุการณ์ฝนที่ย้อนดูได้ |
| `GET /v1/replay/events/{event}/runs/{run}/forecast` · `/radar` | ข้อมูลของรอบหนึ่งในเหตุการณ์ |
| `GET /v1/areas` | ขอบเขตตำบล GeoJSON |
| `GET /v1/metrics` | ผลวัดโมเดล |
| `GET /v1/files/...` | ไฟล์ภาพเรดาร์ |

shape ของข้อมูลอยู่ที่ `apiapp/core/contract.py` ต้องตรงกับ `web/src/lib/features/forecast/domain/types.ts`
