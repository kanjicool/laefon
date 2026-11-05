import { describe, expect, it } from 'vitest';
import { normalizeThai, searchAreas } from './search';

const AREAS = [
	{ area_code: 'TH900103', name_th: 'เกาะแต้ว', district_th: 'เมืองสงขลา' },
	{ area_code: 'TH900105', name_th: 'เกาะยอ', district_th: 'เมืองสงขลา' },
	{ area_code: 'TH900201', name_th: 'เกาะใหญ่', district_th: 'กระแสสินธุ์' },
	{ area_code: 'TH901101', name_th: 'หาดใหญ่', district_th: 'หาดใหญ่' },
	{ area_code: 'TH901102', name_th: 'ควนลัง', district_th: 'หาดใหญ่' }
];

describe('normalizeThai', () => {
	it('ตัดคำนำหน้าและช่องว่าง', () => {
		expect(normalizeThai(' ต. เกาะแต้ว ')).toBe('เกาะแต้ว');
		expect(normalizeThai('ตำบลเกาะ แต้ว')).toBe('เกาะแต้ว');
		expect(normalizeThai('อ.หาดใหญ่')).toBe('หาดใหญ่');
	});
});

describe('searchAreas', () => {
	it('ชื่อที่ขึ้นต้นด้วยคำค้นมาก่อน', () => {
		expect(searchAreas(AREAS, 'เกาะ').map((a) => a.name_th)).toEqual([
			'เกาะแต้ว',
			'เกาะยอ',
			'เกาะใหญ่'
		]);
	});

	it('ค้นด้วยชื่ออำเภอได้ ตำบลชื่อตรงมาก่อนตำบลในอำเภอ', () => {
		expect(searchAreas(AREAS, 'อำเภอหาดใหญ่').map((a) => a.name_th)).toEqual(['หาดใหญ่', 'ควนลัง']);
	});

	it('พิมพ์ ต. นำหน้าก็เจอ', () => {
		expect(searchAreas(AREAS, 'ต.เกาะยอ')).toHaveLength(1);
	});

	it('คำค้นว่างไม่คืนผล', () => {
		expect(searchAreas(AREAS, '  ')).toEqual([]);
	});
});
