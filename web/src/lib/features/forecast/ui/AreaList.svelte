<script lang="ts">
	import { addMinutes, hhmm } from '$lib/utils/time';
	import type { AreaForecast } from '../domain/types';
	import { isRaining, RAIN_LEVELS, rainLevel } from '../domain/wording';

	let {
		areas,
		issuedAt,
		onselect
	}: { areas: AreaForecast[]; issuedAt: string; onselect: (code: string) => void } = $props();

	const rows = $derived(
		areas.map((a) => {
			const i = a.steps.findIndex((s) => isRaining(s.p_rain));
			const when =
				i === 0 ? 'ตกอยู่' : i > 0 ? hhmm(addMinutes(issuedAt, a.steps[i].lead_min - 15)) : '—';
			return {
				code: a.area_code,
				name: a.name_th,
				district: a.district_th,
				when,
				now: i === 0,
				bars: a.steps.map((s) => {
					const level = rainLevel(s.p_rain, s.p_heavy);
					return { lead: s.lead_min, color: RAIN_LEVELS[level].color, h: 4 + level * 4.5 };
				})
			};
		})
	);
</script>

<ul class="flex flex-col">
	{#each rows as row (row.code)}
		<li>
			<button
				type="button"
				onclick={() => onselect(row.code)}
				class="flex w-full items-center gap-3 border-b border-muted px-2 py-2.5 text-left hover:bg-muted/60"
			>
				<span class="flex min-w-0 flex-1 flex-col">
					<span class="font-semibold">ต.{row.name}</span>
					<span class="text-[13px] text-muted-foreground">อ.{row.district}</span>
				</span>
				<span class="flex h-[22px] items-end gap-0.5" aria-hidden="true">
					{#each row.bars as bar (bar.lead)}
						<span class="w-1.5 rounded-[2px]" style:height="{bar.h}px" style:background={bar.color}
						></span>
					{/each}
				</span>
				<span class={['w-16 text-right text-[15px] font-semibold', row.now && 'text-[#2f6fb0]']}
					>{row.when}</span
				>
			</button>
		</li>
	{/each}
</ul>
