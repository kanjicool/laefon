<script lang="ts">
	import Layers from '@lucide/svelte/icons/layers';
	import Navigation2 from '@lucide/svelte/icons/navigation-2';
	import Radar from '@lucide/svelte/icons/radar';
	import Ruler from '@lucide/svelte/icons/ruler';
	import Spline from '@lucide/svelte/icons/spline';
	import type { Overlays } from '../domain/motion';

	let { overlays = $bindable() }: { overlays: Overlays } = $props();

	const options = [
		{ id: 'onion', label: 'ขอบฝนก่อน–หลัง', icon: Layers },
		{ id: 'arrows', label: 'ทิศทางฝน', icon: Navigation2 },
		{ id: 'range', label: 'ขอบเขตเรดาร์', icon: Radar }
	] as const;
	// Shown under their parent while it is on.
	const subOptions = [
		{ id: 'outlines', parent: 'onion', label: 'เส้นขอบฝน', icon: Spline },
		{ id: 'rings', parent: 'range', label: 'ระยะทาง', icon: Ruler }
	] as const;
</script>

<div
	role="group"
	aria-label="แสดงเพิ่มบนแผนที่"
	class="flex flex-col gap-1 rounded-xl bg-card p-1 shadow-[0_2px_8px_rgba(20,33,43,.14)]"
>
	{#each options as opt (opt.id)}
		<button
			type="button"
			aria-pressed={overlays[opt.id]}
			title={opt.label}
			onclick={() => (overlays[opt.id] = !overlays[opt.id])}
			class={[
				'flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2.5 text-left text-[13px] sm:min-h-9 sm:justify-start',
				overlays[opt.id] ? 'bg-[#e6f1f4] font-semibold text-primary' : 'text-foreground'
			]}
		>
			<opt.icon size={16} aria-hidden="true" />
			<!-- Icon only on phones so the panel does not cover the rain. -->
			<span class="sr-only sm:not-sr-only">{opt.label}</span>
		</button>
		{#each subOptions.filter((sub) => sub.parent === opt.id && overlays[opt.id]) as sub (sub.id)}
			<button
				type="button"
				aria-pressed={overlays[sub.id]}
				title={sub.label}
				onclick={() => (overlays[sub.id] = !overlays[sub.id])}
				class={[
					'flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2.5 text-left text-[13px] sm:min-h-9 sm:justify-start sm:pl-7',
					overlays[sub.id] ? 'bg-[#e6f1f4] font-semibold text-primary' : 'text-foreground'
				]}
			>
				<sub.icon size={16} aria-hidden="true" />
				<span class="sr-only sm:not-sr-only">{sub.label}</span>
			</button>
		{/each}
	{/each}
</div>
