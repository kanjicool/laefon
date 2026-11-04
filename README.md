# แลฝน (laefon)

ดูโอกาสฝนตกล่วงหน้า 2 ชั่วโมง รายตำบล จังหวัดสงขลา จากภาพเรดาร์ตรวจอากาศ

> **สถานะ:** อยู่ระหว่างพัฒนา — เป็นโครงงานสหกิจศึกษา ไม่ใช่บริการพยากรณ์อากาศอย่างเป็นทางการ
> ข้อมูลที่อยู่ใน repo นี้เป็นข้อมูลจำลองทั้งหมด ข้อมูลเรดาร์และข้อมูลสถานีจริงไม่ได้เผยแพร่ที่นี่

"แล" เป็นภาษาใต้ แปลว่า "ดู" — แลฝน คือ ดูฝน

## ทำอะไร

1. เทรนโมเดล Deep Learning (U-Net) ทำนายโอกาสฝนตกล่วงหน้า 15–120 นาทีจากภาพเรดาร์
2. รวมผลเป็นรายตำบล แล้วแสดงบนเว็บที่ตอบได้ว่า "ฝนจะถึงตำบลนี้กี่โมง"
3. วัดผลเทียบกับวิธีมาตรฐาน (persistence, optical flow) และค่าฝนจริงจากสถานีตรวจอากาศ

## โครงสร้าง

```
laefon/
├── web/        เว็บ (SvelteKit, build เป็น static)
└── pipeline/   (ยังไม่เริ่ม) Python: อ่านข้อมูลเรดาร์ → ทำนาย → เขียน forecast.json
```

pipeline กับเว็บคุยกันผ่านไฟล์ `forecast.json` ไฟล์เดียว shape ของไฟล์อยู่ที่
[`web/src/lib/features/forecast/domain/types.ts`](web/src/lib/features/forecast/domain/types.ts)
และมีตัวอย่างข้อมูลจำลองที่ [`web/static/data/mock/forecast.json`](web/static/data/mock/forecast.json)

## Stack (web)

- SvelteKit 2 + Svelte 5 + TypeScript — `adapter-static` build เป็นไฟล์ static ล้วน
- Tailwind CSS 4 + shadcn-svelte (bits-ui) + Lucide icons
- Leaflet สำหรับแผนที่
- Prettier + ESLint + Vitest, ใช้ pnpm

## เริ่มพัฒนา

```bash
cd web
pnpm install
pnpm dev        # http://localhost:5173
pnpm check      # type check
pnpm lint       # prettier + eslint
pnpm test       # vitest
pnpm build      # ได้ไฟล์ static ใน web/build
```
