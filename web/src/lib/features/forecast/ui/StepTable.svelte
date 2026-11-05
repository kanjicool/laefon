<script lang="ts">
	import { addMinutes, hhmm } from '$lib/utils/time';
	import type { ForecastStep } from '../domain/types';
	import { percent, RAIN_LEVELS, rainLevel } from '../domain/wording';

	let {
		steps,
		issuedAt,
		showHeavy = false
	}: { steps: ForecastStep[]; issuedAt: string; showHeavy?: boolean } = $props();

	const rows = $derived(
		steps.map((s) => {
			const level = rainLevel(s.p_rain, s.p_heavy);
			return {
				lead: s.lead_min,
				time: `${hhmm(addMinutes(issuedAt, s.lead_min - 15))}–${hhmm(addMinutes(issuedAt, s.lead_min))}`,
				word: RAIN_LEVELS[level].word,
				color: RAIN_LEVELS[level].color,
				p: percent(s.p_rain),
				ph: percent(s.p_heavy)
			};
		})
	);
</script>

<table class="w-full border-collapse text-sm">
	<thead>
		<tr class="text-left text-muted-foreground">
			<th class="px-1 py-1.5 font-medium">เวลา</th>
			<th class="px-1 py-1.5 font-medium">คาดการณ์</th>
			<th class="px-1 py-1.5 text-right font-medium">โอกาสฝน</th>
			{#if showHeavy}<th class="px-1 py-1.5 text-right font-medium">ฝนหนัก</th>{/if}
		</tr>
	</thead>
	<tbody>
		{#each rows as row (row.lead)}
			<tr class="border-t border-muted">
				<td class="px-1 py-2 font-semibold">{row.time}</td>
				<td class="px-1 py-2">
					<span class="inline-flex items-center gap-2">
						<span class="size-3 rounded-[3px] border border-[#d5dbdf]" style:background={row.color}
						></span>
						{row.word}
					</span>
				</td>
				<td class="px-1 py-2 text-right text-muted-foreground">{row.p}</td>
				{#if showHeavy}<td class="px-1 py-2 text-right text-muted-foreground">{row.ph}</td>{/if}
			</tr>
		{/each}
	</tbody>
</table>
