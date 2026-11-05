/**
 * สัญญาข้อมูลระหว่าง pipeline → backend → เว็บ
 * ต้องตรงกับ backend/apiapp/core/contract.py ถ้าเปลี่ยน shape ให้เพิ่ม schema_version แล้วแก้ทั้งสามฝั่ง
 */
export type ForecastFile = {
	schema_version: 2;
	/** true = ข้อมูลจำลอง ห้ามแสดงเหมือนคำพยากรณ์จริง */
	is_mock: boolean;
	/** เวลาของภาพเรดาร์ล่าสุดที่ใช้ทำนาย (ISO 8601 พร้อม timezone) */
	issued_at: string;
	step_minutes: number;
	model: { id: string; name_th: string; version: string };
	areas: AreaForecast[];
};

export type AreaForecast = {
	/** ตรงกับ area_code ใน GeoJSON ขอบเขตตำบล (ADM3 P-code เช่น TH900103) */
	area_code: string;
	name_th: string;
	district_th: string;
	steps: ForecastStep[];
};

export type ForecastStep = {
	lead_min: number;
	/** โอกาสฝน ≥ 1 mm/h (0–1) */
	p_rain: number;
	/** โอกาสฝนหนัก ≥ 5 mm/h (0–1) */
	p_heavy: number;
};

export type RadarFrame = {
	time: string;
	kind: 'observed' | 'forecast';
	/** path ใต้ /api/v1/files */
	src: string;
};

export type RadarFile = {
	schema_version: 1;
	is_mock: boolean;
	/** มุมภาพ [บนซ้าย, บนขวา, ล่างขวา, ล่างซ้าย] เป็น [lon, lat] */
	coordinates: [[number, number], [number, number], [number, number], [number, number]];
	frames: RadarFrame[];
};

export type ReplayEvent = {
	id: string;
	title_th: string;
	description_th: string;
	runs: string[];
	default_run: string;
};

export type ReplayIndex = { schema_version: 1; is_mock: boolean; events: ReplayEvent[] };

export type LeadMetric = {
	lead_min: number;
	threshold_mmh: number;
	csi: number;
	pod: number;
	far: number;
};

export type MetricsFile = {
	schema_version: 1;
	is_mock: boolean;
	test_period_th: string;
	models: { id: string; name_th: string; by_lead: LeadMetric[] }[];
};
