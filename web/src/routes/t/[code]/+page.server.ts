import { error } from '@sveltejs/kit';
import { apiGet } from '$lib/server/api';
import type { ForecastFile } from '$lib/features/forecast/domain/types';
import { startRank } from '$lib/features/forecast/domain/timeline';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params, setHeaders }) => {
	const forecast = await apiGet<ForecastFile>(fetch, '/v1/forecast/latest');
	const area = forecast.areas.find((a) => a.area_code === params.code);
	if (!area) error(404, 'ไม่พบตำบลนี้ ตอนนี้ครอบคลุมเฉพาะจังหวัดสงขลา');
	const sameDistrict = forecast.areas
		.filter((a) => a.district_th === area.district_th && a.area_code !== area.area_code)
		.sort((a, b) => startRank(a) - startRank(b))
		.slice(0, 5);
	setHeaders({ 'cache-control': 'public, max-age=60' });
	return {
		area,
		nearby: sameDistrict,
		issued_at: forecast.issued_at,
		step_minutes: forecast.step_minutes,
		is_mock: forecast.is_mock,
		model: forecast.model
	};
};
