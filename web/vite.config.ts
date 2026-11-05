import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// maplibre-gl v6 creates its worker with { type: 'module' }.
	worker: { format: 'es' },
	test: {
		include: ['src/**/*.{test,spec}.{ts,js}'],
		environment: 'node'
	}
});
