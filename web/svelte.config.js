import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Build เป็นไฟล์ static ล้วน (HTML/JS/CSS) เอาไปวางที่ไหนก็ได้ ไม่ต้องมี Node server
		adapter: adapter()
	}
};

export default config;
