# แลฝน (laefon)

ดูว่าฝนจะตกที่ตำบลของคุณกี่โมง ล่วงหน้า 2 ชั่วโมง จังหวัดสงขลา จากภาพเรดาร์ตรวจอากาศ

> **สถานะ:** demo ระหว่างพัฒนา — โครงงานสหกิจศึกษา ไม่ใช่บริการพยากรณ์อากาศอย่างเป็นทางการ
> ข้อมูลฝนทั้งหมดใน repo นี้เป็นข้อมูลจำลอง ข้อมูลเรดาร์และข้อมูลสถานีจริงไม่ได้เผยแพร่ที่นี่

"แล" เป็นภาษาใต้ แปลว่า "ดู" — แลฝน คือ ดูฝน

## รันทั้งระบบ (Docker)

```bash
cp .env.example .env                # ตั้ง NGINX_PORT (ค่าเริ่มต้น 80 แบบ tent)
docker compose up -d --build        # เปิด http://localhost:<NGINX_PORT>
docker compose run --rm pipeline    # สร้างข้อมูลจำลองชุดใหม่
docker compose down
```

dev แบบ hot reload: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`
(เว็บ http://localhost:5173 · API docs http://localhost:9001/docs — ใช้ 9001 เพื่อไม่ชนกับ tent)

## โครงสร้าง

```
pipeline/ (Python 3.12) ──เขียนไฟล์──► volume laefon-data ◄──อ่าน── backend/ (FastAPI, Python 3.14)
                                                                        ▲
                       browser ──► nginx ──► web/ (SvelteKit, adapter-node) ──BFF /api/v1/*──┘
```

| ส่วน | อะไร | stack |
|---|---|---|
| `web/` | หน้าเว็บ + BFF | SvelteKit 2 (pin `~2.70.3`) · Svelte 5 · Tailwind 4 · shadcn-svelte · MapLibre GL 6 · Vitest 5 |
| `backend/` | API อ่านผลทำนาย ภาพเรดาร์ ผลวัดโมเดล | FastAPI · Pydantic · uv |
| `pipeline/` | ตอนนี้: mock generator · ต่อไป: อ่านเรดาร์ → ทำนาย | numpy · Pillow · shapely (ต่อไป wradlib / pysteps / PyTorch) |
| `nginx/` | reverse proxy · `/public-api/` (GET อย่างเดียว) สำหรับระบบอื่น | nginx 1.29 |

stack อิงตาม project tent (SvelteKit adapter-node + FastAPI + nginx + docker compose) เพื่อให้ต่อยอดเป็นเว็บของศูนย์ฯ ได้

### Data contract

ทั้งสามส่วนคุยกันผ่านไฟล์ JSON ชุดเดียว ถ้าเปลี่ยน shape ต้องแก้สามที่พร้อมกันและเพิ่ม `schema_version`:
`pipeline/laefon_pipeline/mock/generate.py` → `backend/apiapp/core/contract.py` → `web/src/lib/features/forecast/domain/types.ts`

## พัฒนาเว็บ (แบบ tent: หลังบ้านใน Docker, เว็บรันบนเครื่อง)

```bash
cp .env.example .env                                                        # ครั้งแรกครั้งเดียว
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d api    # pipeline + api ที่ 127.0.0.1:9001
cd web && pnpm install && pnpm dev                                          # http://localhost:5173
```

ใน `docker-compose.yml` หลัก มีแค่ nginx ที่เปิด port ออกนอก Docker ส่วน api เปิดที่ `127.0.0.1:9001`
เฉพาะตอนใช้ `docker-compose.dev.yml` เพื่อให้ `pnpm dev` บนเครื่องเรียกได้ ส่วน pipeline ไม่มี port เพราะไม่ใช่ server

## พัฒนาแยกส่วน (ไม่ใช้ docker)

```bash
cd pipeline && uv sync && uv run python -m laefon_pipeline.mock --out ../data/generated
cd backend  && uv sync && DATA_DIR=../data/generated uv run fastapi dev apiapp/main.py --port 9001
cd web      && pnpm install && pnpm dev          # API_URL ค่าเริ่มต้น http://localhost:9001
```

ตรวจก่อน commit:

```bash
cd web && pnpm check && pnpm lint && pnpm test
cd backend && uv run ruff check . && uv run pytest
cd pipeline && uv run ruff check . && uv run pytest
```

## Claude Code skills

`.claude/skills/` มี skill สำหรับ dev โปรเจคนี้: `laefon-design-system`, `project-structure-architecture`, `testing-bestpractices`
(ดัดแปลงจาก tent) และ `svelte-code-writer`, `svelte-core-bestpractices` (จาก sveltejs/ai-tools)

## แหล่งข้อมูลและเครดิต

- ขอบเขตตำบล: OCHA COD-AB Thailand (HDX) — CC BY-IGO · สร้างด้วย `pipeline/scripts/build_reference.py`
- แผนที่ฐาน: OpenFreeMap · © OpenStreetMap contributors
