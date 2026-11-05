<script lang="ts" module>
	export type ScrubPosition = {
		key: string;
		label: string;
		sub: string;
		kind: 'observed' | 'forecast';
	};
</script>

<script lang="ts">
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';

	let {
		positions,
		index = $bindable(0),
		compact = false
	}: { positions: ScrubPosition[]; index?: number; compact?: boolean } = $props();

	let playing = $state(false);
	const current = $derived(positions[index]);
	const firstForecast = $derived(positions.findIndex((p) => p.kind === 'forecast'));

	$effect(() => {
		if (!playing || positions.length < 2) return;
		const timer = setInterval(() => {
			index = (index + 1) % positions.length;
		}, 700);
		return () => clearInterval(timer);
	});
</script>

<div
	class="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-[0_4px_16px_rgba(20,33,43,.16)] lg:gap-4 lg:px-4"
>
	<button
		type="button"
		onclick={() => (playing = !playing)}
		aria-label={playing ? 'หยุด' : 'เล่น'}
		class="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground lg:size-12"
	>
		{#if playing}<Pause size={18} fill="currentColor" />{:else}<Play
				size={18}
				fill="currentColor"
			/>{/if}
	</button>
	<div class={['shrink-0 leading-tight', compact ? 'w-16' : 'w-24 lg:w-28']}>
		<strong class="block text-lg lg:text-[22px]">{current?.label}</strong>
		<span class="text-xs text-muted-foreground">{current?.sub}</span>
	</div>
	<div class="flex min-w-0 flex-1 flex-col gap-1">
		{#if firstForecast > 0 && !compact}
			<div class="flex text-[11px] font-semibold">
				<span class="text-[#33424b]" style:flex={firstForecast}>เกิดแล้ว</span>
				<span
					class="border-l-2 border-selection pl-2 text-primary"
					style:flex={positions.length - firstForecast}>คาดการณ์</span
				>
			</div>
		{/if}
		<input
			type="range"
			min="0"
			max={positions.length - 1}
			step="1"
			bind:value={index}
			aria-label="เลือกเวลา"
			aria-valuetext="{current?.label} {current?.sub}"
			class="w-full accent-primary"
		/>
		{#if !compact}
			<div class="hidden justify-between text-[11px] text-muted-foreground sm:flex">
				{#each positions as p, i (p.key)}
					<span
						class={[
							'w-0 text-center whitespace-nowrap',
							i === index && 'font-bold text-foreground',
							i % 2 === 1 && positions.length > 9 && 'invisible'
						]}>{p.label}</span
					>
				{/each}
			</div>
		{/if}
	</div>
</div>
