<script lang="ts">
	import { addMinutes, hhmm } from '$lib/utils/time';
	import type { ForecastStep } from '../domain/types';
	import { RAIN_LEVELS, rainLevel } from '../domain/wording';

	let {
		steps,
		issuedAt = null,
		height = 56,
		highlight = -1
	}: {
		steps: ForecastStep[];
		/** ใส่เมื่ออยากให้แสดงเวลาใต้แท่ง */
		issuedAt?: string | null;
		height?: number;
		highlight?: number;
	} = $props();

	const bars = $derived(
		steps.map((s) => {
			const level = rainLevel(s.p_rain, s.p_heavy);
			return {
				lead: s.lead_min,
				color: RAIN_LEVELS[level].color,
				h: Math.max(4, Math.round(s.p_rain * height)),
				label: issuedAt ? hhmm(addMinutes(issuedAt, s.lead_min - 15)) : ''
			};
		})
	);
</script>

<div class="flex flex-col gap-1.5" aria-hidden="true">
	<div
		class="grid items-end gap-1"
		style:height="{height}px"
		style:grid-template-columns="repeat({bars.length}, minmax(0, 1fr))"
	>
		{#each bars as bar, i (bar.lead)}
			<span
				class={[
					'rounded-t-[4px] rounded-b-[2px]',
					i === highlight && 'outline-2 outline-offset-2 outline-selection'
				]}
				style:height="{bar.h}px"
				style:background={bar.color}
			></span>
		{/each}
	</div>
	{#if issuedAt}
		<div
			class="grid gap-1 text-center text-[11px] text-[#33424b]"
			style:grid-template-columns="repeat({bars.length}, minmax(0, 1fr))"
		>
			{#each bars as bar (bar.lead)}
				<span>{bar.label}</span>
			{/each}
		</div>
	{/if}
</div>
