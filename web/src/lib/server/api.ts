import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

/**
 * URL ของ FastAPI — ไม่ส่งไปถึง browser
 * docker: http://api:9000 (ตั้งใน docker-compose.yml) · รันบนเครื่อง: 9001 ให้ตรงกับ docker-compose.dev.yml
 * และไม่ชนกับ tent-fastapi ที่ใช้ 9000
 */
export function apiBase(): string {
	return (env.API_URL ?? 'http://localhost:9001').replace(/\/$/, '');
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
