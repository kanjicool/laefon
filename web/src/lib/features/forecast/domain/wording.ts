/**
 * แปลงความน่าจะเป็นเป็นคำและสี — เกณฑ์ทั้งหมดอยู่ที่นี่ที่เดียว (ดู laefon-design-system)
 */
export type RainLevel = 0 | 1 | 2 | 3 | 4;

export const RAIN_THRESHOLDS = { maybe: 0.2, likely: 0.45, certain: 0.7, heavy: 0.5 } as const;

export const RAIN_LEVELS: Record<RainLevel, { word: string; color: string; onColor: string }> = {
	0: { word: 'ไม่น่าตก', color: '#eef1f3', onColor: '#14212b' },
	1: { word: 'อาจมีฝน', color: '#c5def0', onColor: '#14212b' },
	2: { word: 'น่าจะตก', color: '#7fb4dd', onColor: '#14212b' },
	3: { word: 'ฝนตกแน่', color: '#2f6fb0', onColor: '#ffffff' },
	4: { word: 'ตกแน่ อาจหนัก', color: '#5b3c9e', onColor: '#ffffff' }
};

export function rainLevel(pRain: number, pHeavy: number): RainLevel {
	if (pHeavy >= RAIN_THRESHOLDS.heavy) return 4;
	if (pRain >= RAIN_THRESHOLDS.certain) return 3;
	if (pRain >= RAIN_THRESHOLDS.likely) return 2;
	if (pRain >= RAIN_THRESHOLDS.maybe) return 1;
	return 0;
}

/** ถือว่า "ฝนตก" เมื่อถึงขั้นน่าจะตก */
export function isRaining(pRain: number): boolean {
	return pRain >= RAIN_THRESHOLDS.likely;
}

export function percent(p: number): string {
	return `${Math.round(p * 100)}%`;
}
