---
name: project-structure-architecture
description: โครงสร้าง repo แลฝน (web SvelteKit / backend FastAPI / pipeline Python) และกติกาว่า logic ไหนวางตรงไหน รวมถึง data contract ระหว่าง 3 ส่วน Load เมื่อสร้างไฟล์ใหม่ เพิ่ม feature เพิ่ม endpoint หรือแก้ shape ของ forecast/radar/replay/metrics
---

# โครงสร้างโปรเจค แลฝน

ดัดแปลงจาก skill ชื่อเดียวกันของ tent (feature-sliced + domain แยกจาก UI)

## ภาพรวม

```
pipeline/ (Python 3.12)  ──เขียนไฟล์──►  DATA_DIR  ◄──อ่าน──  backend/ (FastAPI, Python 3.14)
                                                                 ▲
                                        browser ──► web/ (SvelteKit adapter-node) ──BFF /api/*──┘
```

- **pipeline** เป็นคนเดียวที่ผลิตข้อมูล (ตอนนี้คือ mock generator ต่อไปคือโมเดลจริง)
- **backend** อ่านอย่างเดียว ไม่คำนวณผลทำนาย ถ้าต้องเปลี่ยนที่เก็บ (เช่น MongoDB) แก้แค่ `apiapp/core/store.py`
- **web** ไม่ยิง FastAPI จาก browser ตรงๆ ใช้ BFF `src/routes/api/[...path]/+server.ts` (แบบ tent) และ server `load` อ่านผ่าน `$lib/server/api.ts`

## Data contract — แก้ต้องแก้ 3 ที่พร้อมกัน

| ที่ | ไฟล์ |
|---|---|
| pipeline (ผู้เขียน) | `pipeline/laefon_pipeline/mock/generate.py` |
| backend (validate) | `backend/apiapp/core/contract.py` |
| web (ใช้) | `web/src/lib/features/forecast/domain/types.ts` |

เปลี่ยน shape = เพิ่ม `schema_version` เสมอ และเพิ่ม test ทั้งฝั่ง backend และ web

## web: `src/lib/features/<feature>/`

- `domain/` TypeScript ล้วน ห้าม import Svelte / DOM / fetch — กฎแปลค่า (`wording.ts`), สรุปเวลา (`timeline.ts`), ค้นหา (`search.ts`) + `*.test.ts`
- `data/` เรียก BFF / parse response
- `ui/` component ของ feature นั้น
- feature ปัจจุบัน: `forecast` (คำตอบ/timeline), `map` (MapLibre, แถบเวลา, legend), `area` (ค้นหา/ตำบล), `model-eval`

shared: `$lib/components/ui` (shadcn ห้ามแก้มือ), `$lib/components/layout` (header, banner), `$lib/server/` (โค้ดฝั่ง Node เท่านั้น ห้าม import เข้า component), `$lib/utils`

routes บางที่สุด: `+page.server.ts` โหลดข้อมูล, `+page.svelte` ประกอบ component

## backend: `apiapp/modules/<name>/router.py`

หนึ่ง module ต่อหนึ่งกลุ่ม endpoint prefix `/v1/...` schema กลางอยู่ที่ `core/contract.py` รหัสที่มาจาก URL ต้องผ่าน `safe_id()` ก่อนไปเป็น path

## กฎ dependency

UI → data → domain, domain ไม่พึ่งอะไร · feature ไม่ import ข้าม feature ยกเว้น `forecast/domain` ที่เป็นแกนกลาง
