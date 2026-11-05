import { describe, expect, it } from 'vitest';
import { bbox, findArea, type AreaCollection } from './locate';

const square = (code: string, x: number, y: number, hole = false) => ({
	type: 'Feature' as const,
	properties: { area_code: code, name_th: code, district_th: 'd' },
	geometry: {
		type: 'Polygon' as const,
		coordinates: [
			[
				[x, y],
				[x + 1, y],
				[x + 1, y + 1],
				[x, y + 1],
				[x, y]
			],
			...(hole
				? [
						[
							[x + 0.4, y + 0.4],
							[x + 0.6, y + 0.4],
							[x + 0.6, y + 0.6],
							[x + 0.4, y + 0.6],
							[x + 0.4, y + 0.4]
						]
					]
				: [])
		]
	}
});

const FC: AreaCollection = {
	type: 'FeatureCollection',
	features: [square('A', 100, 7), square('B', 101, 7, true)]
};

describe('findArea', () => {
	it('เจอตำบลที่จุดอยู่ข้างใน', () => {
		expect(findArea(FC, 100.5, 7.5)?.properties.area_code).toBe('A');
		expect(findArea(FC, 101.2, 7.2)?.properties.area_code).toBe('B');
	});

	it('จุดในรูโหว่หรือนอกพื้นที่ได้ null', () => {
		expect(findArea(FC, 101.5, 7.5)).toBeNull();
		expect(findArea(FC, 99, 7)).toBeNull();
	});

	it('bbox', () => {
		expect(bbox(FC.features[0])).toEqual([
			[100, 7],
			[101, 8]
		]);
	});
});
