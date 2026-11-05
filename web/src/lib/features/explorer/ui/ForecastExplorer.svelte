<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import { untrack, type Snippet } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import SiteFooter from '$lib/components/layout/SiteFooter.svelte';
	import { findArea, type AreaCollection } from '$lib/features/area/domain/locate';
	import AreaSearch from '$lib/features/area/ui/AreaSearch.svelte';
	import { provinceSummary, startRank } from '$lib/features/forecast/domain/timeline';
	import type { ForecastFile, RadarFile } from '$lib/features/forecast/domain/types';
	import { rainLevel, type RainLevel } from '$lib/features/forecast/domain/wording';
	import AnswerCard from '$lib/features/forecast/ui/AnswerCard.svelte';
	import AreaList from '$lib/features/forecast/ui/AreaList.svelte';
	import StepTable from '$lib/features/forecast/ui/StepTable.svelte';
	import RainLegend from '$lib/features/map/ui/RainLegend.svelte';
	import RainMap from '$lib/features/map/ui/RainMap.svelte';
	import TimeScrubber, { type ScrubPosition } from '$lib/features/map/ui/TimeScrubber.svelte';
	import { addMinutes, hhmm } from '$lib/utils/time';

	let {
		forecast,
		radar,
		mode,
		panelTop
	}: {
		forecast: ForecastFile;
		radar: RadarFile;
		mode: 'latest' | 'replay';
		/** Extra content at the top of the panel (replay controls). */
		panelTop?: Snippet;
	} = $props();

	const fileUrl = (src: string) => `/api/v1/files/${src}`;

	let geo = $state.raw<AreaCollection | null>(null);
	let selected = $state<string | null>(page.url.searchParams.get('t'));
	// Read once; the replay page remounts via {#key} when the run changes.
	let layer = $state<'choropleth' | 'radar'>(
		untrack(() => (mode === 'replay' ? 'radar' : 'choropleth'))
	);
	let choroIdx = $state(0);
	let radarIdx = $state(
		untrack(() => radar.frames.filter((f) => f.kind === 'observed').length - 1)
	);
	let locateError = $state<string | null>(null);

	$effect(() => {
		let cancelled = false;
		fetch('/api/v1/areas')
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (!cancelled) geo = data;
			});
		return () => {
			cancelled = true;
		};
	});

	const area = $derived(forecast.areas.find((a) => a.area_code === selected) ?? null);
	const summary = $derived(provinceSummary(forecast.areas));
	const soonest = $derived(
		[...forecast.areas]
			.filter((a) => startRank(a) < Infinity)
			.sort((a, b) => startRank(a) - startRank(b))
			.slice(0, 6)
	);

	const choroPositions: ScrubPosition[] = $derived(
		forecast.areas[0]?.steps.map((s) => ({
			key: `c${s.lead_min}`,
			// Label each step by its start time (lead 15 = now).
			label: hhmm(addMinutes(forecast.issued_at, s.lead_min - forecast.step_minutes)),
			sub:
				s.lead_min === forecast.step_minutes
					? 'ตอนนี้'
					: `อีก ${s.lead_min - forecast.step_minutes} นาที`,
			kind: 'forecast' as const
		})) ?? []
	);
	const radarPositions: ScrubPosition[] = $derived(
		radar.frames.map((f) => ({
			key: f.src,
			label: hhmm(f.time),
			sub: f.kind === 'observed' ? 'เกิดแล้ว' : 'คาดการณ์',
			kind: f.kind
		}))
	);
	const levels = $derived.by(() => {
		const out: Record<string, RainLevel> = {};
		for (const a of forecast.areas) {
			const s = a.steps[choroIdx];
			out[a.area_code] = s ? rainLevel(s.p_rain, s.p_heavy) : 0;
		}
		return out;
	});
	const frame = $derived(radar.frames[radarIdx]);

	function select(code: string | null) {
		selected = code;
		locateError = null;
		const url = new URL(page.url);
		if (code) url.searchParams.set('t', code);
		else url.searchParams.delete('t');
		replaceState(url, {});
	}

	function locate() {
		locateError = null;
		if (!navigator.geolocation) {
			locateError = 'เบราว์เซอร์นี้หาตำแหน่งไม่ได้ ค้นหาชื่อตำบลแทนได้';
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const hit = geo && findArea(geo, pos.coords.longitude, pos.coords.latitude);
				if (hit) select(hit.properties.area_code);
				else locateError = 'ตำแหน่งของคุณอยู่นอกจังหวัดสงขลา ตอนนี้ยังไม่ครอบคลุม';
			},
			() => (locateError = 'เบราว์เซอร์ไม่อนุญาตให้ใช้ตำแหน่ง ค้นหาชื่อตำบลแทนได้'),
			{ timeout: 10_000 }
		);
	}

	const shareUrl = $derived(
		area
			? `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(`${page.url.origin}/t/${area.area_code}`)}`
			: ''
	);
</script>

<div class="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
	<aside
		class="flex w-full flex-col gap-5 border-r bg-card p-4 lg:w-[400px] lg:shrink-0 lg:overflow-y-auto lg:p-5"
	>
		{@render panelTop?.()}

		<div class="flex flex-col gap-2">
			<AreaSearch
				areas={forecast.areas}
				onselect={select}
				onlocate={mode === 'latest' ? locate : undefined}
			/>
			{#if locateError}<p class="text-sm text-warn-fg" role="alert">{locateError}</p>{/if}
		</div>

		{#if area}
			<button
				type="button"
				onclick={() => select(null)}
				class="inline-flex items-center gap-1 self-start text-sm text-primary"
			>
				<ChevronLeft size={16} aria-hidden="true" />ภาพรวมสงขลา
			</button>
			<div>
				<h1 class="text-2xl font-bold">ตำบล{area.name_th}</h1>
				<p class="text-[15px] text-muted-foreground">อำเภอ{area.district_th}</p>
			</div>
			<AnswerCard {area} issuedAt={forecast.issued_at} stepMinutes={forecast.step_minutes} />
			<section>
				<h2 class="mb-1.5 text-[15px] font-semibold">ทุก 15 นาที</h2>
				<StepTable steps={area.steps} issuedAt={forecast.issued_at} />
			</section>
			<div class="flex gap-2">
				<a
					href="/t/{area.area_code}"
					class="grid h-12 flex-1 place-items-center rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground no-underline"
					>เปิดหน้าตำบลนี้</a
				>
				{#if mode === 'latest'}
					<a
						href={shareUrl}
						target="_blank"
						rel="noopener"
						class="grid h-12 flex-1 place-items-center rounded-xl bg-line-green text-[15px] font-semibold text-white no-underline"
						>แชร์ลง LINE</a
					>
				{/if}
			</div>
		{:else}
			<section class="flex flex-col gap-1.5">
				<p class="text-[13px] font-semibold tracking-wide text-primary">
					ภาพรวมสงขลา · 2 ชั่วโมงข้างหน้า
				</p>
				<h1 class="text-2xl leading-snug font-bold">
					{#if summary.withinHour === 0}2 ชั่วโมงข้างหน้าไม่น่ามีฝนในสงขลา
					{:else if summary.rainingNow > 0}ฝนตกอยู่ {summary.rainingNow} ตำบล
					{:else}ฝนกำลังเข้ามาใน 1 ชั่วโมง{/if}
				</h1>
				<p class="text-sm text-muted-foreground">
					ข้อมูลเรดาร์ {hhmm(forecast.issued_at)} · อัปเดตทุก {forecast.step_minutes} นาที
				</p>
			</section>
			<div class="grid grid-cols-3 gap-2">
				<div class="rounded-xl border p-3">
					<div class="text-[28px] font-bold">{summary.rainingNow}</div>
					<div class="text-[13px] text-muted-foreground">ตำบล ฝนตกตอนนี้</div>
				</div>
				<div class="rounded-xl border p-3">
					<div class="text-[28px] font-bold">{summary.withinHour}</div>
					<div class="text-[13px] text-muted-foreground">ตำบล ตกใน 1 ชม.</div>
				</div>
				<div class="rounded-xl border border-[#d9cdee] bg-[#f5f1fb] p-3">
					<div class="text-[28px] font-bold text-[#5b3c9e]">{summary.heavy}</div>
					<div class="text-[13px] text-[#4a3a6b]">ตำบล อาจหนัก</div>
				</div>
			</div>
			{#if soonest.length}
				<section>
					<h2 class="mb-1.5 font-semibold">ฝนจะถึงเร็วที่สุด</h2>
					<AreaList areas={soonest} issuedAt={forecast.issued_at} onselect={select} />
				</section>
			{/if}
		{/if}

		<div class="mt-auto pt-2"><SiteFooter /></div>
	</aside>

	<!-- Mobile: scrubber below the map (keeps attribution visible). Desktop: floats on the map. -->
	<main class="flex flex-1 flex-col bg-card lg:relative lg:block lg:bg-[#d7e6ee]">
		<div class="relative h-[52vh] min-h-[380px] bg-[#d7e6ee] lg:absolute lg:inset-0 lg:h-auto">
			<RainMap
				{geo}
				{levels}
				{selected}
				{layer}
				radarSrc={frame ? fileUrl(frame.src) : null}
				radarCoords={radar.coordinates}
				preload={radar.frames.map((f) => fileUrl(f.src))}
				onselect={select}
			/>
			<div
				class="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2 lg:inset-x-4 lg:top-4"
			>
				<div class="pointer-events-auto hidden sm:block">
					<RainLegend
						{layer}
						time={layer === 'radar'
							? frame
								? hhmm(frame.time)
								: ''
							: (choroPositions[choroIdx]?.label ?? '')}
					/>
				</div>
				<div
					role="group"
					aria-label="ชั้นข้อมูลแผนที่"
					class="pointer-events-auto ml-auto flex gap-1 rounded-xl bg-card p-1 shadow-[0_2px_8px_rgba(20,33,43,.14)]"
				>
					{#each [{ id: 'choropleth', label: 'โอกาสฝนรายตำบล' }, { id: 'radar', label: 'ภาพเรดาร์' }] as const as opt (opt.id)}
						<button
							type="button"
							aria-pressed={layer === opt.id}
							onclick={() => (layer = opt.id)}
							class={[
								'rounded-lg px-3 py-2 text-sm',
								layer === opt.id
									? 'bg-primary font-semibold text-primary-foreground'
									: 'text-foreground'
							]}>{opt.label}</button
						>
					{/each}
				</div>
			</div>
		</div>
		<div class="border-b p-3 lg:absolute lg:inset-x-4 lg:right-16 lg:bottom-4 lg:border-0 lg:p-0">
			{#if layer === 'radar'}
				<TimeScrubber positions={radarPositions} bind:index={radarIdx} />
			{:else}
				<TimeScrubber positions={choroPositions} bind:index={choroIdx} />
			{/if}
		</div>
	</main>
</div>
