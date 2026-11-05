import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Node server (เหมือน tent): หน้าเว็บ SSR + BFF `/api/*` ที่ส่งต่อไป FastAPI
		adapter: adapter()
	}
};

export default config;
