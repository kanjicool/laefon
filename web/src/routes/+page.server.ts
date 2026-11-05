import { apiGet } from '$lib/server/api';
import type { ForecastFile, RadarFile } from '$lib/features/forecast/domain/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
	const [forecast, radar] = await Promise.all([
		apiGet<ForecastFile>(fetch, '/v1/forecast/latest'),
		apiGet<RadarFile>(fetch, '/v1/radar/latest')
	]);
	setHeaders({ 'cache-control': 'public, max-age=60' });
	return { forecast, radar };
};
