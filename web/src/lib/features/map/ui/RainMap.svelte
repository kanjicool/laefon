<script lang="ts">
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { GeoJSONSource, ImageSource, Map as MlMap, Marker } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { bbox, type AreaCollection } from '$lib/features/area/domain/locate';
	import { RAIN_LEVELS, type RainLevel } from '$lib/features/forecast/domain/wording';
	import type { RadarFile, RadarSite } from '$lib/features/forecast/domain/types';
	import { ringLabelPoint, type CoverageMask, type LineCollection } from '../domain/motion';

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
		onion = null,
		ghosts = [],
		arrows = null,
		range = null,
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
		/** Rain outlines of nearby frames (see motion.ts onionOutlines). */
		onion?: LineCollection | null;
		/** Past radar image URLs, nearest first, drawn as faded grey ghosts. */
		ghosts?: string[];
		/** Trails and arrows (see motion.ts motionArrows). */
		arrows?: LineCollection | null;
		range?: { site: RadarSite; mask: CoverageMask; rings: LineCollection | null } | null;
		onselect?: (code: string) => void;
	} = $props();

	const EMPTY = { type: 'FeatureCollection' as const, features: [] };
	let map = $state.raw<MlMap | null>(null);
	let maplib = $state.raw<typeof import('maplibre-gl') | null>(null);
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
				addOverlayLayers(instance);
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
				maplib = maplibregl;
				map = instance;
				ready = true;
			});
		});
		return () => {
			disposed = true;
			ready = false;
			map = null;
			maplib = null;
			instance?.remove();
		};
	}

	const OVERLAY_BOTTOM = 'range';

	/** Overlays sit above tambons and radar, below the selected outline. */
	function addOverlayLayers(m: MlMap) {
		for (const id of ['range', 'rings', 'onion', 'arrows'])
			m.addSource(id, { type: 'geojson', data: EMPTY });
		const round = { 'line-cap': 'round', 'line-join': 'round' } as const;
		// Windy-style: grey out what the radar cannot see, thin solid edge.
		m.addLayer({
			id: 'range',
			type: 'fill',
			source: 'range',
			paint: { 'fill-color': '#4a5a66', 'fill-opacity': 0.28 }
		});
		m.addLayer({
			id: 'range-edge',
			type: 'line',
			source: 'range',
			paint: { 'line-color': '#4a5a66', 'line-width': 1, 'line-opacity': 0.7 }
		});
		m.addLayer({
			id: 'rings',
			type: 'line',
			source: 'rings',
			paint: {
				'line-color': '#4a5a66',
				'line-width': 1,
				'line-opacity': 0.6,
				'line-dasharray': [3, 3]
			}
		});
		// Farther frames fade more, like animation onion skin.
		const fade = ['match', ['abs', ['get', 'offset']], 1, 0.85, 0.45] as never;
		m.addLayer({
			id: 'onion-past',
			type: 'line',
			source: 'onion',
			filter: ['<', ['get', 'offset'], 0],
			layout: round,
			paint: { 'line-color': '#5a6b76', 'line-width': 1.8, 'line-opacity': fade }
		});
		m.addLayer({
			id: 'onion-now',
			type: 'line',
			source: 'onion',
			filter: ['==', ['get', 'offset'], 0],
			layout: round,
			paint: { 'line-color': '#14212b', 'line-width': 2.2 }
		});
		m.addLayer({
			id: 'onion-future',
			type: 'line',
			source: 'onion',
			filter: ['>', ['get', 'offset'], 0],
			paint: {
				'line-color': '#0f5f73',
				'line-width': 1.8,
				'line-opacity': fade,
				'line-dasharray': [2, 1.5]
			}
		});
		m.addLayer({
			id: 'arrows-trail',
			type: 'line',
			source: 'arrows',
			filter: ['==', ['get', 'kind'], 'trail'],
			layout: round,
			paint: {
				'line-color': '#14212b',
				'line-width': 1.6,
				'line-opacity': 0.6,
				'line-dasharray': [0.5, 2]
			}
		});
		m.addLayer({
			id: 'arrows-casing',
			type: 'line',
			source: 'arrows',
			filter: ['!=', ['get', 'kind'], 'trail'],
			layout: round,
			paint: { 'line-color': '#ffffff', 'line-width': 7 }
		});
		m.addLayer({
			id: 'arrows',
			type: 'line',
			source: 'arrows',
			filter: ['!=', ['get', 'kind'], 'trail'],
			layout: round,
			paint: { 'line-color': '#14212b', 'line-width': 3 }
		});
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
					paint: { 'raster-opacity': 0, 'raster-resampling': 'linear', 'raster-fade-duration': 0 }
				},
				OVERLAY_BOTTOM
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

	// Past frames as grey, faded radar images under the current one.
	const GHOST_OPACITY = [0.45, 0.25];
	$effect(() => {
		if (!ready || !map || !radarCoords) return;
		GHOST_OPACITY.forEach((opacity, i) => {
			const id = `ghost-${i}`;
			const url = ghosts[i];
			const src = map!.getSource(id) as ImageSource | undefined;
			if (url && src) src.updateImage({ url, coordinates: radarCoords });
			else if (url) {
				map!.addSource(id, { type: 'image', url, coordinates: radarCoords });
				map!.addLayer(
					{
						id,
						type: 'raster',
						source: id,
						paint: {
							'raster-saturation': -1,
							'raster-brightness-min': 0.35,
							'raster-resampling': 'linear',
							'raster-fade-duration': 0
						}
					},
					map!.getLayer('radar') ? 'radar' : OVERLAY_BOTTOM
				);
			}
			if (map!.getLayer(id)) map!.setPaintProperty(id, 'raster-opacity', url ? opacity : 0);
		});
	});

	$effect(() => {
		if (!ready || !map) return;
		(map.getSource('onion') as GeoJSONSource).setData((onion ?? EMPTY) as never);
		(map.getSource('arrows') as GeoJSONSource).setData((arrows ?? EMPTY) as never);
	});

	// Coverage mask + a small dot at the radar site.
	$effect(() => {
		if (!ready || !map || !maplib) return;
		(map.getSource('range') as GeoJSONSource).setData((range?.mask ?? EMPTY) as never);
		(map.getSource('rings') as GeoJSONSource).setData((range?.rings ?? EMPTY) as never);
		if (!range) return;
		const el = (cls: string, text = '') => {
			const div = document.createElement('div');
			div.className = cls;
			div.textContent = text;
			return div;
		};
		const dot = el('laefon-site');
		dot.title = range.site.name_th;
		const markers: Marker[] = [
			new maplib.Marker({ element: dot }).setLngLat([range.site.lon, range.site.lat])
		];
		// HTML labels: the page font renders Thai, basemap glyphs may not.
		if (range.rings)
			for (const km of range.site.rings_km)
				markers.push(
					new maplib.Marker({ element: el('laefon-ring', `${km} กม.`) }).setLngLat(
						ringLabelPoint(range.site, km)
					)
				);
		for (const mk of markers) mk.addTo(map);
		return () => markers.forEach((mk) => mk.remove());
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

<style>
	:global(.laefon-site) {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #4a5a66;
		border: 2px solid #fff;
	}
	:global(.laefon-ring) {
		font-size: 11px;
		color: #33424d;
		background: rgb(255 255 255 / 0.85);
		padding: 0 4px;
		border-radius: 4px;
		pointer-events: none;
	}
</style>
