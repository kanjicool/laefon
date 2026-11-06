import { describe, expect, it } from 'vitest';
import type { RadarFrame, RadarSite, Track } from '$lib/features/forecast/domain/types';
import {
	coverageMask,
	distanceKm,
	frameIndexAt,
	motionArrows,
	onionOutlines,
	ghostFrames,
	rangeRings
} from './motion';
import { scaleGroups } from './radar-scale';

const frame = (min: number, outline: RadarFrame['outline'] = []): RadarFrame => ({
	time: new Date(Date.UTC(2025, 0, 1, 7, min)).toISOString(),
	kind: 'observed',
	src: `${min}.png`,
	outline
});
const frames = [0, 15, 30, 45].map((m) =>
	frame(m, [
		[
			[100, 7],
			[100.1, 7]
		]
	])
);

describe('frameIndexAt', () => {
	it('picks the nearest frame', () => {
		expect(frameIndexAt(frames, new Date(Date.UTC(2025, 0, 1, 7, 20)))).toBe(1);
		expect(frameIndexAt(frames, new Date(Date.UTC(2025, 0, 1, 9, 0)))).toBe(3);
	});
});

describe('onion skin', () => {
	it('outlines frames inside the span, clipped at the ends', () => {
		const offsets = (i: number, span: number) =>
			onionOutlines(frames, i, span).features.map((f) => f.properties.offset);
		expect(offsets(0, 2)).toEqual([0, 1, 2]);
		expect(offsets(2, 1)).toEqual([-1, 0, 1]);
	});
	it('ghosts past frames nearest first', () => {
		expect(ghostFrames(frames, 2).map((f) => f.src)).toEqual(['15.png', '0.png']);
		expect(ghostFrames(frames, 0)).toEqual([]);
	});
});

describe('motionArrows', () => {
	// ~11 km per 15 min eastward = ~44 km/h
	const moving: Track = { id: 'a', path: [[100, 7], [100.1, 7], [100.2, 7], null] };
	const still: Track = {
		id: 'b',
		path: [
			[100, 7],
			[100, 7],
			[100, 7],
			[100, 7]
		]
	};

	it('draws trail, shaft and head for a moving cell', () => {
		const kinds = motionArrows([moving], frames, 1).features.map((f) => f.properties.kind);
		expect(kinds).toEqual(['trail', 'shaft', 'head']);
		const shaft = motionArrows([moving], frames, 1).features[1];
		expect(shaft.geometry.coordinates[1][0]).toBeCloseTo(100.3);
		expect(shaft.properties.speed_kmh).toBeGreaterThan(40);
	});

	it('uses the previous step at the last known point', () => {
		const shaft = motionArrows([moving], frames, 2).features.find(
			(f) => f.properties.kind === 'shaft'
		);
		expect(shaft?.geometry.coordinates[1][0]).toBeCloseTo(100.4);
	});

	it('skips absent and stationary cells', () => {
		expect(motionArrows([moving], frames, 3).features).toEqual([]);
		expect(
			motionArrows([still], frames, 1).features.filter((f) => f.properties.kind !== 'trail')
		).toEqual([]);
	});
});

describe('rangeRings', () => {
	const site: RadarSite = { name_th: 'r', lon: 100.45, lat: 7.43, rings_km: [60, 240] };
	it('draws closed rings at the right radius', () => {
		const rings = rangeRings(site).features;
		expect(rings.map((r) => r.properties.km)).toEqual([60, 240]);
		for (const r of rings) {
			const c = r.geometry.coordinates;
			expect(c[0]).toEqual(c[c.length - 1]);
			const km = Number(r.properties.km);
			for (const p of c.filter((_, i) => i % 16 === 0))
				expect(distanceKm([site.lon, site.lat], p)).toBeCloseTo(km, 0);
		}
	});
});

describe('scaleGroups', () => {
	it('puts every band under exactly one word, ascending', () => {
		const groups = scaleGroups([
			{ dbz: 30, color: 'y' },
			{ dbz: 14, color: 'g' },
			{ dbz: 60, color: 'p' }
		]);
		expect(groups.map((g) => [g.word, g.colors])).toEqual([
			['เล็กน้อย', ['g']],
			['ปานกลาง', ['y']],
			['รุนแรง', ['p']]
		]);
	});
});

describe('coverageMask', () => {
	it('has the max range ring as its hole', () => {
		const site: RadarSite = { name_th: 'r', lon: 100.45, lat: 7.43, rings_km: [60, 240] };
		const [outer, hole] = coverageMask(site).geometry.coordinates;
		expect(outer).toHaveLength(5);
		expect(distanceKm([site.lon, site.lat], hole[10])).toBeCloseTo(240, 0);
	});
});
