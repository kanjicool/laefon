<script lang="ts">
	import { RAIN_LEVELS, type RainLevel } from '$lib/features/forecast/domain/wording';

	let { layer, time }: { layer: 'choropleth' | 'radar'; time: string } = $props();

	const choro = ([0, 1, 2, 3, 4] as RainLevel[]).map((l) => ({
		color: RAIN_LEVELS[l].color,
		word: l === 4 ? 'อาจหนัก' : RAIN_LEVELS[l].word
	}));
	const radar = [
		{ color: '#a9d3ef', word: 'เล็กน้อย' },
		{ color: '#5fa8e0', word: 'ปานกลาง' },
		{ color: '#2f6fb0', word: 'หนัก' },
		{ color: '#4b3fa3', word: 'หนักมาก' },
		{ color: '#8e3ba8', word: 'รุนแรง' }
	];
	const items = $derived(layer === 'radar' ? radar : choro);
</script>

<div
	class="flex flex-col gap-1.5 rounded-xl bg-card/95 px-3 py-2.5 text-xs shadow-[0_2px_8px_rgba(20,33,43,.14)]"
>
	<strong>{layer === 'radar' ? 'ความแรงฝนจากเรดาร์' : 'โอกาสฝน'} · {time}</strong>
	{#each items as item (item.word)}
		<span class="flex items-center gap-2">
			<span class="h-3 w-[18px] rounded-[3px] border border-black/5" style:background={item.color}
			></span>
			{item.word}
		</span>
	{/each}
</div>
