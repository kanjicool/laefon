import type { LonLat, RadarFrame, RadarSite, Track } from '$lib/features/forecast/domain/types';

type Line = {
	type: 'Feature';
	properties: Record<string, number | string>;
	geometry: { type: 'LineString'; coordinates: LonLat[] };
};
export type LineCollection = { type: 'FeatureCollection'; features: Line[] };

const KM_PER_DEG = 111.32;
const kmScale = (lat: number) => Math.cos((lat * Math.PI) / 180);

const line = (coordinates: LonLat[], properties: Line['properties']): Line => ({
	type: 'Feature',
	properties,
	geometry: { type: 'LineString', coordinates }
});
const collection = (features: Line[]): LineCollection => ({ type: 'FeatureCollection', features });

/** Index of the frame closest in time. */
export function frameIndexAt(frames: RadarFrame[], time: Date | string): number {
	const t = new Date(time).getTime();
	let best = 0;
	frames.forEach((f, i) => {
		const d = Math.abs(new Date(f.time).getTime() - t);
		if (d < Math.abs(new Date(frames[best].time).getTime() - t)) best = i;
	});
	return best;
}

/**
 * Rain outlines of nearby frames (optional lines on top of the ghost images).
 * offset < 0 = before, 0 = now, > 0 = after.
 */
export function onionOutlines(frames: RadarFrame[], idx: number, span = 2): LineCollection {
	const out: Line[] = [];
	for (let off = -span; off <= span; off++) {
		const f = frames[idx + off];
		if (!f) continue;
		for (const coords of f.outline) out.push(line(coords, { offset: off }));
	}
	return collection(out);
}

/** Past frames for the grey ghost images, nearest first. */
export function ghostFrames(frames: RadarFrame[], idx: number, span = 2): RadarFrame[] {
	const out: RadarFrame[] = [];
	for (let off = 1; off <= span && idx - off >= 0; off++) out.push(frames[idx - off]);
	return out;
}

/** Distance in km between two points (equirectangular, fine at this scale). */
export function distanceKm(a: LonLat, b: LonLat): number {
	const dx = (b[0] - a[0]) * kmScale((a[1] + b[1]) / 2);
	return Math.hypot(dx, b[1] - a[1]) * KM_PER_DEG;
}

const STILL_KMH = 3;

/**
 * Motion arrows at frame idx: past trail + an arrow showing where each cell
 * goes in the next `ahead` frames. Cells moving slower than 3 km/h get no arrow.
 */
export function motionArrows(
	tracks: Track[],
	frames: RadarFrame[],
	idx: number,
	ahead = 2
): LineCollection {
	const stepH =
		frames.length > 1
			? (new Date(frames[1].time).getTime() - new Date(frames[0].time).getTime()) / 3_600_000
			: 0.25;
	const out: Line[] = [];
	for (const t of tracks) {
		const p = t.path[idx];
		if (!p) continue;

		const trail: LonLat[] = [];
		for (let i = idx; i >= 0 && t.path[i]; i--) trail.unshift(t.path[i]!);
		if (trail.length > 1) out.push(line(trail, { kind: 'trail', id: t.id }));

		const next = t.path[idx + 1];
		const prev = t.path[idx - 1];
		const v: LonLat | null = next
			? [next[0] - p[0], next[1] - p[1]]
			: prev
				? [p[0] - prev[0], p[1] - prev[1]]
				: null;
		if (!v) continue;
		const speed = distanceKm(p, [p[0] + v[0], p[1] + v[1]]) / stepH;
		if (speed < STILL_KMH) continue;

		const end: LonLat = [p[0] + v[0] * ahead, p[1] + v[1] * ahead];
		out.push(line([p, end], { kind: 'shaft', id: t.id, speed_kmh: Math.round(speed) }));
		out.push(line(arrowHead(p, end), { kind: 'head', id: t.id }));
	}
	return collection(out);
}

/** Chevron at `end`, in a locally square frame so it is not squashed by longitude. */
function arrowHead(start: LonLat, end: LonLat): LonLat[] {
	const s = kmScale(end[1]);
	const dx = (end[0] - start[0]) * s;
	const dy = end[1] - start[1];
	const len = Math.hypot(dx, dy);
	const size = Math.min(len * 0.35, 0.05);
	const ang = Math.atan2(dy, dx);
	const wing = (a: number): LonLat => [
		end[0] + (Math.cos(a) * size) / s,
		end[1] + Math.sin(a) * size
	];
	return [wing(ang + (Math.PI * 5) / 6), end, wing(ang - (Math.PI * 5) / 6)];
}

/** Range rings around the radar site. */
export function rangeRings(site: RadarSite, segments = 128): LineCollection {
	const s = kmScale(site.lat);
	return collection(
		site.rings_km.map((km) => {
			const r = km / KM_PER_DEG;
			const coords: LonLat[] = [];
			for (let i = 0; i < segments; i++) {
				const a = (i / segments) * 2 * Math.PI;
				coords.push([site.lon + (Math.cos(a) * r) / s, site.lat + Math.sin(a) * r]);
			}
			coords.push(coords[0]); // exact closure
			return line(coords, { km });
		})
	);
}

/** Map display modes the user can switch on. */
export type Overlays = {
	onion: boolean;
	/** Sub-option of onion: outline lines. */
	outlines: boolean;
	arrows: boolean;
	range: boolean;
	/** Sub-option of range: distance rings. */
	rings: boolean;
};

/** Where to put a ring's distance label: due north of the site. */
export function ringLabelPoint(site: RadarSite, km: number): LonLat {
	return [site.lon, site.lat + km / KM_PER_DEG];
}

export type CoverageMask = {
	type: 'Feature';
	properties: Record<string, never>;
	geometry: { type: 'Polygon'; coordinates: LonLat[][] };
};

/**
 * Windy-style coverage: a polygon covering everything outside the radar's
 * maximum range, so areas the radar cannot see are greyed out.
 */
export function coverageMask(site: RadarSite): CoverageMask {
	const maxKm = Math.max(...site.rings_km);
	const edge = rangeRings({ ...site, rings_km: [maxKm] }).features[0].geometry.coordinates;
	const world: LonLat[] = [
		[site.lon - 40, site.lat - 40],
		[site.lon + 40, site.lat - 40],
		[site.lon + 40, site.lat + 40],
		[site.lon - 40, site.lat + 40],
		[site.lon - 40, site.lat - 40]
	];
	// Hole winds opposite to the outer ring.
	return {
		type: 'Feature',
		properties: {},
		geometry: { type: 'Polygon', coordinates: [world, [...edge].reverse()] }
	};
}
