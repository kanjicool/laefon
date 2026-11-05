import type { AreaForecast, ForecastStep } from './types';
import { isRaining, RAIN_THRESHOLDS } from './wording';

export type RainSummary =
	| { kind: 'raining'; endsAt: Date | null; heavy: HeavyWindow | null }
	| { kind: 'starts'; startsAt: Date; endsAt: Date | null; heavy: HeavyWindow | null }
	| { kind: 'maybe'; at: Date }
	| { kind: 'none' };

export type HeavyWindow = { from: Date; to: Date };

const stepTime = (issuedAt: Date, s: ForecastStep) =>
	new Date(issuedAt.getTime() + s.lead_min * 60_000);

function heavyWindow(steps: ForecastStep[], issuedAt: Date, stepMin: number): HeavyWindow | null {
	const first = steps.findIndex((s) => s.p_heavy >= RAIN_THRESHOLDS.heavy);
	if (first < 0) return null;
	let last = first;
	while (last + 1 < steps.length && steps[last + 1].p_heavy >= RAIN_THRESHOLDS.heavy) last++;
	const from = new Date(stepTime(issuedAt, steps[first]).getTime() - stepMin * 60_000);
	return { from, to: stepTime(issuedAt, steps[last]) };
}

/**
 * Summarize a tambon forecast: raining now, start time, end time.
 * The step with lead 15 covers issued_at -> +15 min.
 */
export function summarize(steps: ForecastStep[], issuedAt: Date, stepMin = 15): RainSummary {
	if (steps.length === 0) return { kind: 'none' };
	const heavy = heavyWindow(steps, issuedAt, stepMin);
	const startIdx = steps.findIndex((s) => isRaining(s.p_rain));
	if (startIdx < 0) {
		const maybe = steps.find((s) => s.p_rain >= RAIN_THRESHOLDS.maybe);
		return maybe
			? { kind: 'maybe', at: begin(stepTime(issuedAt, maybe), stepMin) }
			: { kind: 'none' };
	}
	const endIdx = steps.findIndex((s, i) => i > startIdx && !isRaining(s.p_rain));
	const endsAt = endIdx < 0 ? null : begin(stepTime(issuedAt, steps[endIdx]), stepMin);
	if (startIdx === 0) return { kind: 'raining', endsAt, heavy };
	return {
		kind: 'starts',
		startsAt: begin(stepTime(issuedAt, steps[startIdx]), stepMin),
		endsAt,
		heavy
	};
}

/** Start of a step's window (the 15:15 step covers 15:00-15:15). */
function begin(end: Date, stepMin: number): Date {
	return new Date(end.getTime() - stepMin * 60_000);
}

/** Sort key: 0 = raining now, Infinity = no rain. */
export function startRank(area: AreaForecast): number {
	const i = area.steps.findIndex((s) => isRaining(s.p_rain));
	return i < 0 ? Infinity : area.steps[i].lead_min - area.steps[0].lead_min;
}

export function durationText(from: Date, to: Date): string {
	const min = Math.round((to.getTime() - from.getTime()) / 60_000);
	const h = Math.floor(min / 60);
	const m = min % 60;
	if (h === 0) return `${m} นาที`;
	return m === 0 ? `${h} ชั่วโมง` : `${h} ชั่วโมง ${m} นาที`;
}

export type ProvinceSummary = { rainingNow: number; withinHour: number; heavy: number };

export function provinceSummary(areas: AreaForecast[]): ProvinceSummary {
	return {
		rainingNow: areas.filter((a) => isRaining(a.steps[0]?.p_rain ?? 0)).length,
		withinHour: areas.filter((a) => a.steps.slice(0, 4).some((s) => isRaining(s.p_rain))).length,
		heavy: areas.filter((a) => a.steps.some((s) => s.p_heavy >= RAIN_THRESHOLDS.heavy)).length
	};
}
