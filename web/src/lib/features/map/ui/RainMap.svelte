<script lang="ts">
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { GeoJSONSource, ImageSource, Map as MlMap } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { bbox, type AreaCollection } from '$lib/features/area/domain/locate';
	import { RAIN_LEVELS, type RainLevel } from '$lib/features/forecast/domain/wording';
	import type { RadarFile } from '$lib/features/forecast/domain/types';

	const STYLE = 'https://tiles.openfreemap.org/styles/positron';
	// Used when the basemap fails to load, so tambons and rain still render.
	const WATER = '#c6dceb';
	const FALLBACK_STYLE = {
		version: 8 as const,
		sources: {},
		layers: [{ id: 'bg', type: 'background' as const, paint: { 'background-color': WATER } }]
	};

	async function loadStyle() {
		try {
			const res = await fetch(STYLE, { signal: AbortSignal.timeout(6000) });
			if (!res.ok) return FALLBACK_STYLE;
			const style = await res.json();
			// Recolor water before map creation; setPaintProperty after load did not apply.
			for (const l of style.layers ?? [])
				if (l.type === 'fill' && String(l.id).includes('water'))
					l.paint = { ...l.paint, 'fill-color': WATER };
			return style;
		} catch {
			return FALLBACK_STYLE;
		}
	}
	const SONGKHLA: [[number, number], [number, number]] = [
		[100.02, 6.45],
		[101.12, 7.95]
	];

	let {
		geo,
		levels,
		selected = null,
		layer = 'choropleth',
		radarSrc = null,
		radarCoords = null,
		preload = [],
		interactive = true,
		onselect
	}: {
		geo: AreaCollection | null;
		/** Rain level per tambon at the selected time. */
		levels: Record<string, RainLevel>;
		selected?: string | null;
		layer?: 'choropleth' | 'radar';
		radarSrc?: string | null;
		radarCoords?: RadarFile['coordinates'] | null;
		preload?: string[];
		interactive?: boolean;
		onselect?: (code: string) => void;
	} = $props();

	let map = $state.raw<MlMap | null>(null);
	let ready = $state(false);

	const fillColor = [
		'match',
		['coalesce', ['feature-state', 'level'], 0],
		...([1, 2, 3, 4] as RainLevel[]).flatMap((l) => [l, RAIN_LEVELS[l].color]),
		RAIN_LEVELS[0].color
	];

	function mount(node: HTMLDivElement) {
		let disposed = false;
		let instance: MlMap | null = null;
		const clickHandler = untrack(() => onselect);
		// Dynamic import: maplibre needs window, so it cannot load during SSR.
		Promise.all([
			import('maplibre-gl'),
			loadStyle(),
			// v6 ships the worker as a separate ESM file; let Vite bundle it.
			import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url')
		]).then(([maplibregl, style, worker]) => {
			if (disposed) return;
			maplibregl.setWorkerUrl(worker.default);
			const m = new maplibregl.Map({
				container: node,
				style,
				bounds: SONGKHLA,
				fitBoundsOptions: { padding: 24 },
				interactive: untrack(() => interactive),
				attributionControl: { compact: true }
			});
			instance = m;
			if (untrack(() => interactive))
				m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
			m.on('load', () => {
				if (disposed || !instance) return;
				const firstSymbol = instance.getStyle().layers.find((l) => l.type === 'symbol')?.id;
				instance.addSource('areas', {
					type: 'geojson',
					data: { type: 'FeatureCollection', features: [] },
					promoteId: 'area_code'
				});
				instance.addLayer(
					{
						id: 'areas-fill',
						type: 'fill',
						source: 'areas',
						paint: {
							'fill-color': fillColor as never,
							'fill-opacity': 0.85,
							'fill-opacity-transition': { duration: 200 }
						}
					},
					firstSymbol
				);
				instance.addLayer(
					{
						id: 'areas-line',
						type: 'line',
						source: 'areas',
						paint: { 'line-color': '#ffffff', 'line-width': 0.8 }
					},
					firstSymbol
				);
				instance.addLayer({
					id: 'areas-selected-halo',
					type: 'line',
					source: 'areas',
					filter: ['==', ['get', 'area_code'], ''],
					paint: { 'line-color': '#ffffff', 'line-width': 7 }
				});
				instance.addLayer({
					id: 'areas-selected',
					type: 'line',
					source: 'areas',
					filter: ['==', ['get', 'area_code'], ''],
					paint: { 'line-color': '#e8590c', 'line-width': 3.5 }
				});
				instance.on('click', 'areas-fill', (e) => {
					const code = e.features?.[0]?.properties?.area_code;
					if (code) clickHandler?.(String(code));
				});
				instance.on(
					'mouseenter',
					'areas-fill',
					() => (instance!.getCanvas().style.cursor = 'pointer')
				);
				instance.on('mouseleave', 'areas-fill', () => (instance!.getCanvas().style.cursor = ''));
				map = instance;
				ready = true;
			});
		});
		return () => {
			disposed = true;
			ready = false;
			map = null;
			instance?.remove();
		};
	}

	// Load tambon boundaries.
	$effect(() => {
		if (!ready || !map || !geo) return;
		(map.getSource('areas') as GeoJSONSource).setData(geo as never);
	});

	// Color by rain level.
	$effect(() => {
		if (!ready || !map || !geo) return;
		for (const [code, level] of Object.entries(levels)) {
			map.setFeatureState({ source: 'areas', id: code }, { level });
		}
	});

	// Highlight and zoom to the selected tambon.
	$effect(() => {
		if (!ready || !map) return;
		const filter = ['==', ['get', 'area_code'], selected ?? ''] as never;
		map.setFilter('areas-selected', filter);
		map.setFilter('areas-selected-halo', filter);
		const feature = selected
			? geo?.features.find((f) => f.properties.area_code === selected)
			: null;
		if (feature) map.fitBounds(bbox(feature), { padding: 80, maxZoom: 10.5, duration: 600 });
	});

	// Radar image.
	$effect(() => {
		if (!ready || !map || !radarSrc || !radarCoords) return;
		const src = map.getSource('radar') as ImageSource | undefined;
		if (src) src.updateImage({ url: radarSrc, coordinates: radarCoords });
		else {
			map.addSource('radar', { type: 'image', url: radarSrc, coordinates: radarCoords });
			map.addLayer(
				{
					id: 'radar',
					type: 'raster',
					source: 'radar',
					paint: { 'raster-opacity': 0, 'raster-resampling': 'nearest', 'raster-fade-duration': 0 }
				},
				'areas-selected-halo'
			);
		}
	});

	// Layer toggle.
	$effect(() => {
		if (!ready || !map) return;
		const radarOn = layer === 'radar';
		map.setPaintProperty('areas-fill', 'fill-opacity', radarOn ? 0 : 0.85);
		map.setPaintProperty('areas-line', 'line-color', radarOn ? '#5d6b74' : '#ffffff');
		map.setPaintProperty('areas-line', 'line-opacity', radarOn ? 0.35 : 1);
		if (map.getLayer('radar')) map.setPaintProperty('radar', 'raster-opacity', radarOn ? 0.9 : 0);
	});

	// Preload frames to avoid flicker during playback.
	$effect(() => {
		for (const url of preload) new Image().src = url;
	});
</script>

<!-- maplibre forces position: relative on its container, so wrap it. -->
<div class="absolute inset-0" role="region" aria-label="แผนที่โอกาสฝนรายตำบล จังหวัดสงขลา">
	<div {@attach mount} class="h-full w-full"></div>
</div>
