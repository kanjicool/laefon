import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

/** URL ของ FastAPI ภายใน (docker: http://api:9000) — ไม่ส่งไปถึง browser */
export function apiBase(): string {
	return (env.API_URL ?? 'http://localhost:9000').replace(/\/$/, '');
}

export async function apiGet<T>(fetchFn: typeof fetch, path: string): Promise<T> {
	let res: Response;
	try {
		res = await fetchFn(`${apiBase()}${path}`);
	} catch {
		error(503, 'ต่อเซิร์ฟเวอร์ข้อมูลไม่ได้ ลองใหม่อีกครั้ง');
	}
	if (res.status === 404) error(404, 'ไม่พบข้อมูล');
	if (!res.ok) error(502, 'เซิร์ฟเวอร์ข้อมูลตอบผิดพลาด');
	return (await res.json()) as T;
}
