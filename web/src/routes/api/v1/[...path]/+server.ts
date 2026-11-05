import { apiBase } from '$lib/server/api';
import type { RequestHandler } from './$types';

/**
 * BFF แบบเดียวกับ tent: browser เรียก /api/v1/* แล้ว SvelteKit ส่งต่อไป FastAPI
 * browser จึงไม่ต้องรู้ที่อยู่ API ภายใน อ่านอย่างเดียว (GET)
 */
export const GET: RequestHandler = async ({ params, url, fetch }) => {
	const upstream = await fetch(`${apiBase()}/v1/${params.path}${url.search}`);
	const headers = new Headers();
	for (const key of ['content-type', 'content-length', 'etag', 'last-modified']) {
		const value = upstream.headers.get(key);
		if (value) headers.set(key, value);
	}
	// ภาพเรดาร์ของรอบที่ผ่านมาแล้วไม่เปลี่ยน ส่วน JSON ล่าสุดเปลี่ยนทุก 15 นาที
	headers.set(
		'cache-control',
		params.path.startsWith('files/') ? 'public, max-age=86400' : 'public, max-age=60'
	);
	return new Response(upstream.body, { status: upstream.status, headers });
};
