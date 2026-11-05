/** หาตำบลจากพิกัด GPS (ray casting) — ใช้กับ GeoJSON ขอบเขตตำบล ไม่ต้องพึ่ง library */

type Ring = number[][];
type Geometry =
	{ type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] };

export type AreaFeature = {
	type: 'Feature';
	properties: { area_code: string; name_th: string; district_th: string };
	geometry: Geometry;
};

export type AreaCollection = { type: 'FeatureCollection'; features: AreaFeature[] };

function inRing(lon: number, lat: number, ring: Ring): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

function inPolygon(lon: number, lat: number, rings: Ring[]): boolean {
	return inRing(lon, lat, rings[0]) && !rings.slice(1).some((hole) => inRing(lon, lat, hole));
}

export function findArea(fc: AreaCollection, lon: number, lat: number): AreaFeature | null {
	for (const f of fc.features) {
		const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
		if (polys.some((rings) => inPolygon(lon, lat, rings))) return f;
	}
	return null;
}

/** [[minLon, minLat], [maxLon, maxLat]] */
export function bbox(f: AreaFeature): [[number, number], [number, number]] {
	const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
	let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
	for (const rings of polys)
		for (const [x, y] of rings[0]) {
			x0 = Math.min(x0, x);
			y0 = Math.min(y0, y);
			x1 = Math.max(x1, x);
			y1 = Math.max(y1, y);
		}
	return [
		[x0, y0],
		[x1, y1]
	];
}
