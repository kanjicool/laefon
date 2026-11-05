<script lang="ts">
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { GeoJSONSource, ImageSource, Map as MlMap } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { bbox, type AreaCollection } from '$lib/features/area/domain/locate';
	import { RAIN_LEVELS, type RainLevel } from '$lib/features/forecast/domain/wording';
	import type { RadarFile } from '$lib/features/forecast/domain/types';

	const STYLE = 'https://tiles.openfreemap.org/styles/positron';
	// ถ้าโหลด basemap ไม่ได้ (เน็ตช้า/ถูกบล็อก) ยังแสดงขอบเขตตำบลกับฝนได้บนพื้นสีทะเล
	const FALLBACK_STYLE = {
		version: 8 as const,
		sources: {},
		layers: [{ id: 'bg', type: 'background' as const, paint: { 'background-color': '#d7e6ee' } }]
	};

	async function loadStyle() {
		try {
			const res = await fetch(STYLE, { signal: AbortSignal.timeout(6000) });
			return res.ok ? await res.json() : FALLBACK_STYLE;
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
		/** ขั้นฝนรายตำบล ณ เวลาที่เลือก */
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
		// import แบบ dynamic เพราะ maplibre ต้องใช้ window — ฝั่ง SSR โหลดไม่ได้
		Promise.all([
			import('maplibre-gl'),
			loadStyle(),
			// v6 แยก worker เป็นไฟล์ ESM ให้ Vite bundle แล้วบอก URL ให้ maplibre
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
				const layers = instance.getStyle().layers;
				const firstSymbol = layers.find((l) => l.type === 'symbol')?.id;
				// ทะเล/ทะเลสาบเป็นสีฟ้าตาม design system (positron เดิมเป็นสีเทา)
				for (const l of layers)
					if (l.type === 'fill' && l.id.includes('water'))
						instance.setPaintProperty(l.id, 'fill-color', '#cfe0ea');
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

	// ใส่ขอบเขตตำบลเมื่อโหลด GeoJSON เสร็จ
	$effect(() => {
		if (!ready || !map || !geo) return;
		(map.getSource('areas') as GeoJSONSource).setData(geo as never);
	});

	// ระบายสีตามขั้นฝนของเวลาที่เลือก
	$effect(() => {
		if (!ready || !map || !geo) return;
		for (const [code, level] of Object.entries(levels)) {
			map.setFeatureState({ source: 'areas', id: code }, { level });
		}
	});

	// ตำบลที่เลือก + ซูมไปหา
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

	// ภาพเรดาร์
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

	// สลับชั้นข้อมูล
	$effect(() => {
		if (!ready || !map) return;
		const radarOn = layer === 'radar';
		map.setPaintProperty('areas-fill', 'fill-opacity', radarOn ? 0 : 0.85);
		map.setPaintProperty('areas-line', 'line-color', radarOn ? '#5d6b74' : '#ffffff');
		map.setPaintProperty('areas-line', 'line-opacity', radarOn ? 0.35 : 1);
		if (map.getLayer('radar')) map.setPaintProperty('radar', 'raster-opacity', radarOn ? 0.9 : 0);
	});

	// โหลดภาพเรดาร์ทุก frame ไว้ก่อน ตอนเล่นจะได้ไม่กระพริบ
	$effect(() => {
		for (const url of preload) new Image().src = url;
	});
</script>

<!-- maplibre ตั้ง position: relative ให้ container เอง จึงต้องมีกล่องนอกที่เป็น absolute -->
<div class="absolute inset-0" role="region" aria-label="แผนที่โอกาสฝนรายตำบล จังหวัดสงขลา">
	<div {@attach mount} class="h-full w-full"></div>
</div>
