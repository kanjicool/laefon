import { describe, expect, it } from 'vitest';
import { durationText, provinceSummary, startRank, summarize } from './timeline';
import type { AreaForecast, ForecastStep } from './types';
import { rainLevel } from './wording';

const ISSUED = new Date('2026-11-20T14:30:00+07:00');
const steps = (pRain: number[], pHeavy: number[] = []): ForecastStep[] =>
	pRain.map((p, i) => ({ lead_min: (i + 1) * 15, p_rain: p, p_heavy: pHeavy[i] ?? 0 }));
const hhmm = (d: Date) =>
	d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });

describe('summarize', () => {
	it('บอกว่าตกอยู่ เมื่อช่วงแรกโอกาส ≥ 0.45 และบอกเวลาหยุด', () => {
		const s = summarize(steps([0.8, 0.9, 0.6, 0.2, 0, 0, 0, 0]), ISSUED);
		expect(s.kind).toBe('raining');
		if (s.kind !== 'raining') return;
		expect(s.endsAt && hhmm(s.endsAt)).toBe('15:15');
	});

	it('บอกเวลาเริ่มเป็นต้นช่วงของ step แรกที่ฝนตก', () => {
		const s = summarize(steps([0.1, 0.3, 0.6, 0.9, 0.9, 0.5, 0.2, 0.1]), ISSUED);
		expect(s.kind).toBe('starts');
		if (s.kind !== 'starts') return;
		expect(hhmm(s.startsAt)).toBe('15:00');
		expect(s.endsAt && hhmm(s.endsAt)).toBe('16:00');
	});

	it('endsAt เป็น null เมื่อฝนตกยาวเลย 120 นาที', () => {
		const s = summarize(steps([0.1, 0.5, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9]), ISSUED);
		expect(s.kind === 'starts' && s.endsAt).toBeNull();
	});

	it('ตกๆ หยุดๆ ใช้ช่วงฝนแรก', () => {
		const s = summarize(steps([0.6, 0.1, 0.7, 0.1, 0, 0, 0, 0]), ISSUED);
		expect(s.kind === 'raining' && s.endsAt && hhmm(s.endsAt)).toBe('14:45');
	});

	it('บอกว่าอาจมีฝน เมื่อไม่ถึงเกณฑ์ตกแต่มีช่วง ≥ 0.2', () => {
		expect(summarize(steps([0, 0, 0.25, 0.3, 0, 0, 0, 0]), ISSUED).kind).toBe('maybe');
	});

	it('ไม่ตกเลย', () => {
		expect(summarize(steps([0, 0, 0, 0, 0, 0, 0, 0]), ISSUED).kind).toBe('none');
		expect(summarize([], ISSUED).kind).toBe('none');
	});

	it('หาช่วงฝนหนักต่อเนื่อง', () => {
		const s = summarize(steps([0.5, 0.9, 0.9, 0.9, 0.4], [0, 0.6, 0.7, 0.2, 0]), ISSUED);
		expect(s.kind).toBe('raining');
		if (s.kind !== 'raining' || !s.heavy) throw new Error('ต้องมีช่วงฝนหนัก');
		expect([hhmm(s.heavy.from), hhmm(s.heavy.to)]).toEqual(['14:45', '15:15']);
	});
});

describe('rainLevel', () => {
	it.each([
		[0.19, 0, 0],
		[0.2, 0, 1],
		[0.45, 0, 2],
		[0.7, 0, 3],
		[0.3, 0.5, 4]
	])('p_rain=%s p_heavy=%s → ขั้น %s', (p, h, level) => {
		expect(rainLevel(p, h)).toBe(level);
	});
});

describe('helpers', () => {
	const area = (pRain: number[], pHeavy: number[] = []): AreaForecast => ({
		area_code: 'X',
		name_th: 'x',
		district_th: 'y',
		steps: steps(pRain, pHeavy)
	});

	it('startRank เรียงตกอยู่ก่อน ไม่ตกไว้ท้าย', () => {
		expect(startRank(area([0.9]))).toBe(0);
		expect(startRank(area([0, 0, 0.6]))).toBe(30);
		expect(startRank(area([0, 0]))).toBe(Infinity);
	});

	it('provinceSummary นับตำบล', () => {
		const s = provinceSummary([area([0.9]), area([0, 0, 0.5], [0, 0, 0.6]), area([0])]);
		expect(s).toEqual({ rainingNow: 1, withinHour: 2, heavy: 1 });
	});

	it('durationText', () => {
		const t = (m: number) => new Date(ISSUED.getTime() + m * 60_000);
		expect(durationText(ISSUED, t(45))).toBe('45 นาที');
		expect(durationText(ISSUED, t(60))).toBe('1 ชั่วโมง');
		expect(durationText(ISSUED, t(75))).toBe('1 ชั่วโมง 15 นาที');
	});
});
