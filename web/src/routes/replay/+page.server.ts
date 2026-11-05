import { error } from '@sveltejs/kit';
import { apiGet } from '$lib/server/api';
import type { ForecastFile, RadarFile, ReplayIndex } from '$lib/features/forecast/domain/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const index = await apiGet<ReplayIndex>(fetch, '/v1/replay/events');
	const event = index.events.find((e) => e.id === url.searchParams.get('event')) ?? index.events[0];
	if (!event) error(404, 'ยังไม่มีเหตุการณ์ให้ย้อนดู');
	const runParam = url.searchParams.get('run');
	const run = runParam && event.runs.includes(runParam) ? runParam : event.default_run;
	const base = `/v1/replay/events/${event.id}/runs/${run}`;
	const [forecast, radar] = await Promise.all([
		apiGet<ForecastFile>(fetch, `${base}/forecast`),
		apiGet<RadarFile>(fetch, `${base}/radar`)
	]);
	return { index, event, run, forecast, radar };
};
