import type { ScaleBand } from '$lib/features/forecast/domain/types';

/** Words for the radar legend, so color is never the only cue. ~mm/h in comments. */
export const RADAR_WORDS = [
	{ from: 14, word: 'เล็กน้อย' }, // < 2.5 mm/h
	{ from: 29, word: 'ปานกลาง' }, // 2.5–10
	{ from: 39, word: 'หนัก' }, // 10–40
	{ from: 49, word: 'หนักมาก' }, // 40–100
	{ from: 56.5, word: 'รุนแรง' } // hail likely
] as const;

export type ScaleGroup = { word: string; from: number; colors: string[] };

/** Group the color bands under each word, in ascending dBZ. */
export function scaleGroups(scale: ScaleBand[]): ScaleGroup[] {
	const groups: ScaleGroup[] = RADAR_WORDS.map((w) => ({ ...w, colors: [] }));
	for (const band of [...scale].sort((a, b) => a.dbz - b.dbz)) {
		const g = groups.findLast((x) => band.dbz >= x.from) ?? groups[0];
		g.colors.push(band.color);
	}
	return groups.filter((g) => g.colors.length > 0);
}
