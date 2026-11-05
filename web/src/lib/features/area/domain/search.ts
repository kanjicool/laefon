export type Searchable = { area_code: string; name_th: string; district_th: string };

/** ตัดคำนำหน้า (ต./ตำบล/อ./อำเภอ) และช่องว่าง ให้พิมพ์ได้หลายแบบ */
export function normalizeThai(text: string): string {
	return text
		.trim()
		.replace(/(ตำบล|อำเภอ|ต\.|อ\.)/g, '')
		.replace(/\s+/g, '')
		.toLowerCase();
}

export function searchAreas<T extends Searchable>(areas: T[], query: string, limit = 8): T[] {
	const q = normalizeThai(query);
	if (!q) return [];
	const scored: { area: T; score: number }[] = [];
	for (const area of areas) {
		const name = normalizeThai(area.name_th);
		const district = normalizeThai(area.district_th);
		let score = -1;
		if (name.startsWith(q)) score = 0;
		else if (name.includes(q)) score = 1;
		else if (district.startsWith(q)) score = 2;
		else if (district.includes(q)) score = 3;
		if (score >= 0) scored.push({ area, score });
	}
	return scored
		.sort((a, b) => a.score - b.score || a.area.name_th.localeCompare(b.area.name_th, 'th'))
		.slice(0, limit)
		.map((s) => s.area);
}
