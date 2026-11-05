import { apiGet } from '$lib/server/api';
import type { MetricsFile } from '$lib/features/forecast/domain/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => ({
	metrics: await apiGet<MetricsFile>(fetch, '/v1/metrics')
});
