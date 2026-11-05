const TZ = 'Asia/Bangkok';

const timeFmt = new Intl.DateTimeFormat('th-TH', {
	hour: '2-digit',
	minute: '2-digit',
	hour12: false,
	timeZone: TZ
});
const dateFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', timeZone: TZ });

/** 14:30 */
export function hhmm(d: Date | string): string {
	return timeFmt.format(typeof d === 'string' ? new Date(d) : d);
}

/** 14 ธ.ค. */
export function dayMonth(d: Date | string): string {
	return dateFmt.format(typeof d === 'string' ? new Date(d) : d);
}

export function addMinutes(d: Date | string, minutes: number): Date {
	return new Date(new Date(d).getTime() + minutes * 60_000);
}

export function minutesSince(d: Date | string, now = new Date()): number {
	return Math.round((now.getTime() - new Date(d).getTime()) / 60_000);
}
