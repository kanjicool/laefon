<script lang="ts">
	import type { ScaleBand } from '$lib/features/forecast/domain/types';
	import { RAIN_LEVELS, type RainLevel } from '$lib/features/forecast/domain/wording';
	import { scaleGroups } from '../domain/radar-scale';
	import type { Overlays } from '../domain/motion';

	let {
		layer,
		time,
		scale,
		overlays
	}: { layer: 'choropleth' | 'radar'; time: string; scale: ScaleBand[]; overlays: Overlays } =
		$props();

	const choro = ([0, 1, 2, 3, 4] as RainLevel[]).map((l) => ({
		colors: [RAIN_LEVELS[l].color],
		word: l === 4 ? 'อาจหนัก' : RAIN_LEVELS[l].word
	}));
	// Strongest first, like the TMD legend.
	const items = $derived(layer === 'radar' ? scaleGroups(scale).reverse() : choro);
</script>

<div
	class="flex flex-col gap-1.5 rounded-xl bg-card/95 px-3 py-2.5 text-xs shadow-[0_2px_8px_rgba(20,33,43,.14)]"
>
	<strong>{layer === 'radar' ? 'ความแรงฝนจากเรดาร์' : 'โอกาสฝน'} · {time}</strong>
	{#each items as item (item.word)}
		<span class="flex items-center gap-2">
			<span class="flex h-3 w-[18px] overflow-hidden rounded-[3px] border border-black/5">
				{#each item.colors as c (c)}<span class="flex-1" style:background={c}></span>{/each}
			</span>
			{item.word}
		</span>
	{/each}
	{#if layer === 'radar'}
		<span class="text-[11px] text-muted-foreground">สีเดียวกับเรดาร์กรมอุตุฯ (dBZ)</span>
	{/if}

	{#if overlays.onion || overlays.arrows || overlays.range}
		<hr class="my-0.5 border-border" />
		{#if overlays.onion}
			<span class="flex items-center gap-2">
				<span class="h-3 w-[18px] rounded-[3px] bg-[#9aa3a9]/60"></span>ฝนก่อนหน้า (เทาจาง)
			</span>
			{#if overlays.outlines}
				<span class="flex items-center gap-2">
					<svg width="18" height="8" aria-hidden="true"
						><line x1="1" y1="4" x2="17" y2="4" stroke="#5a6b76" stroke-width="2" /></svg
					>ขอบฝนก่อนหน้า
				</span>
				<span class="flex items-center gap-2">
					<svg width="18" height="8" aria-hidden="true"
						><line x1="1" y1="4" x2="17" y2="4" stroke="#14212b" stroke-width="2.5" /></svg
					>ขอบฝนตอนนี้
				</span>
				<span class="flex items-center gap-2">
					<svg width="18" height="8" aria-hidden="true"
						><line
							x1="1"
							y1="4"
							x2="17"
							y2="4"
							stroke="#0f5f73"
							stroke-width="2"
							stroke-dasharray="4 3"
						/></svg
					>ขอบฝนถัดไป
				</span>
			{/if}
		{/if}
		{#if overlays.arrows}
			<span class="flex items-center gap-2">
				<svg width="18" height="10" aria-hidden="true"
					><path
						d="M1 5h15M12 1.5 16 5l-4 3.5"
						fill="none"
						stroke="#14212b"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/></svg
				>ทิศที่ฝนไปใน 30 นาที
			</span>
		{/if}
		{#if overlays.range}
			<span class="flex items-center gap-2">
				<span class="h-3 w-[18px] rounded-[3px] bg-[#4a5a66]/30"></span>นอกระยะเรดาร์ (240 กม.)
			</span>
			{#if overlays.rings}
				<span class="flex items-center gap-2">
					<svg width="18" height="8" aria-hidden="true"
						><line
							x1="1"
							y1="4"
							x2="17"
							y2="4"
							stroke="#4a5a66"
							stroke-width="1.5"
							stroke-dasharray="3 3"
						/></svg
					>ระยะทางจากเรดาร์
				</span>
			{/if}
		{/if}
	{/if}
</div>
