---
name: testing-bestpractices
description: วิธีเขียน test ของแลฝน ทั้ง web (Vitest/Playwright), backend (pytest) และ pipeline (pytest) พร้อมเคสที่ต้องมีเสมอ Load เมื่อเขียนหรือรีวิว test
---

# Testing (แลฝน)

ดัดแปลงจาก skill ชื่อเดียวกันของ tent

## คำสั่ง

| ส่วน | คำสั่ง |
|---|---|
| web | `cd web && pnpm test` (Vitest) · `pnpm check` · `pnpm lint` |
| backend | `cd backend && uv run pytest` · `uv run ruff check .` |
| pipeline | `cd pipeline && uv run pytest` |

## web (Vitest)

- ทุกไฟล์ใน `features/*/domain/` ต้องมี `*.test.ts` คู่กัน — เป็น pure function ไม่ต้อง mock
- ใช้ `describe/it/expect` จาก `vitest` ชื่อ test เขียนเป็นพฤติกรรม: `it('บอกว่าตกอยู่ เมื่อช่วงแรกโอกาส ≥ 0.5')`
- ถ้าต้องใช้ DOM ใส่ `// @vitest-environment happy-dom` บนสุด (ยังไม่ได้ติดตั้ง happy-dom — ติดตั้งเมื่อจำเป็น)

## backend (pytest)

- ใช้ `TestClient` + `tmp_path` เขียน JSON fixture แล้วตั้ง `DATA_DIR` ด้วย `monkeypatch` อย่าพึ่งไฟล์ใน `data/generated`
- ทุก endpoint ที่รับ id จาก URL ต้องมี test ว่า id อันตราย (`..`, ตัวใหญ่, ช่องว่าง) ได้ 404

## pipeline (pytest)

- test ว่าไฟล์ที่สร้าง validate ผ่าน contract (โหลด JSON แล้วเช็ค key/ช่วงค่า 0–1)
- ใช้ seed คงที่ ผลต้องเหมือนเดิมทุกครั้ง

## เคสที่ต้องมีเสมอ (domain ฝนรายตำบล)

1. สรุปเวลา: ตกอยู่แล้ว / เริ่มตกทีหลัง / ไม่ตกเลย / ตกๆ หยุดๆ / ตกเลย 120 นาที
2. เกณฑ์คำ: ค่าที่ขอบพอดี (0.2, 0.45, 0.7) ได้คำถูกขั้น และ `p_heavy ≥ 0.5` ได้ป้าย "อาจหนัก"
3. ค้นหา: พิมพ์ "ต.", "ตำบล", มีช่องว่าง, พิมพ์ชื่ออำเภอ ต้องเจอ
4. ข้อมูลจำลอง (`is_mock`) ต้องมีแถบเตือนเสมอ — e2e เช็คว่าแถบขึ้น
