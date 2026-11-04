/**
 * สัญญาของไฟล์ `forecast.json` ระหว่าง pipeline (Python) กับเว็บ
 *
 * pipeline เขียนไฟล์ตาม shape นี้ทุกรอบที่ทำนาย ส่วนเว็บอ่านอย่างเดียว
 * ถ้าจะเปลี่ยน shape ให้เพิ่ม `schema_version` แล้วแก้ทั้งสองฝั่งพร้อมกัน
 */
export type ForecastFile = {
	schema_version: 1;
	/** true = ข้อมูลจำลอง ห้ามแสดงเหมือนคำพยากรณ์จริง */
	is_mock: boolean;
	/** เวลาของภาพเรดาร์ล่าสุดที่ใช้ทำนาย (ISO 8601 พร้อม timezone) */
	issued_at: string;
	/** ระยะห่างระหว่างช่วงทำนาย (นาที) — เรดาร์สแกนทุก 15 นาที */
	step_minutes: number;
	areas: AreaForecast[];
};

/** ผลทำนายของหนึ่งพื้นที่ (ตำบล) */
export type AreaForecast = {
	/** รหัสพื้นที่ ต้องตรงกับ property ใน GeoJSON ขอบเขตตำบล */
	area_code: string;
	name_th: string;
	district_th: string;
	steps: ForecastStep[];
};

/** ผลทำนายหนึ่งช่วงเวลา */
export type ForecastStep = {
	/** ล่วงหน้ากี่นาทีนับจาก `issued_at` เช่น 15, 30, ..., 120 */
	lead_min: number;
	/** โอกาสฝนตก ≥ 1 mm/h (0–1) */
	p_rain: number;
	/** โอกาสฝนตกหนัก ≥ 5 mm/h (0–1) */
	p_heavy: number;
};
