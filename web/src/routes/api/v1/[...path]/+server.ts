import { apiBase } from '$lib/server/api';
import type { RequestHandler } from './$types';

/**
 * Read-only BFF (as in tent): proxies /api/v1/* to FastAPI so the browser never sees its address.
 */
export const GET: RequestHandler = async ({ params, url, fetch }) => {
	const upstream = await fetch(`${apiBase()}/v1/${params.path}${url.search}`);
	const headers = new Headers();
	for (const key of ['content-type', 'content-length', 'etag', 'last-modified']) {
		const value = upstream.headers.get(key);
		if (value) headers.set(key, value);
	}
	// Past radar images never change; latest JSON changes every 15 min.
	headers.set(
		'cache-control',
		params.path.startsWith('files/') ? 'public, max-age=86400' : 'public, max-age=60'
	);
	return new Response(upstream.body, { status: upstream.status, headers });
};
