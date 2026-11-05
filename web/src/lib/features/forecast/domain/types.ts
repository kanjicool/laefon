/**
 * Data contract: pipeline -> backend -> web.
 * Keep in sync with backend/apiapp/core/contract.py; bump schema_version on change.
 */
export type ForecastFile = {
	schema_version: 2;
	/** Mock data must never be presented as a real forecast. */
	is_mock: boolean;
	/** Time of the latest radar scan used (ISO 8601 with offset). */
	issued_at: string;
	step_minutes: number;
	model: { id: string; name_th: string; version: string };
	areas: AreaForecast[];
};

export type AreaForecast = {
	/** ADM3 P-code, matches area_code in the boundary GeoJSON. */
	area_code: string;
	name_th: string;
	district_th: string;
	steps: ForecastStep[];
};

export type ForecastStep = {
	lead_min: number;
	/** P(rain >= 1 mm/h) */
	p_rain: number;
	/** P(rain >= 5 mm/h) */
	p_heavy: number;
};

export type RadarFrame = {
	time: string;
	kind: 'observed' | 'forecast';
	/** Path under /api/v1/files */
	src: string;
};

export type RadarFile = {
	schema_version: 1;
	is_mock: boolean;
	/** Image corners [TL, TR, BR, BL] as [lon, lat]. */
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
