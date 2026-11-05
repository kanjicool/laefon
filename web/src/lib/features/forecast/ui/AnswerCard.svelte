<script lang="ts">
	import CloudRain from '@lucide/svelte/icons/cloud-rain';
	import Sun from '@lucide/svelte/icons/sun';
	import { hhmm } from '$lib/utils/time';
	import { durationText, summarize } from '../domain/timeline';
	import type { AreaForecast } from '../domain/types';
	import RainBars from './RainBars.svelte';

	let {
		area,
		issuedAt,
		stepMinutes = 15,
		size = 'md'
	}: { area: AreaForecast; issuedAt: string; stepMinutes?: number; size?: 'md' | 'lg' } = $props();

	const summary = $derived(summarize(area.steps, new Date(issuedAt), stepMinutes));
	const horizonEnd = $derived(
		new Date(new Date(issuedAt).getTime() + (area.steps.at(-1)?.lead_min ?? 120) * 60_000)
	);

	const view = $derived.by(() => {
		switch (summary.kind) {
			case 'raining':
				return {
					lead: 'ตอนนี้',
					main: 'ฝนกำลังตก',
					detail: summary.endsAt
						? `น่าจะหยุดประมาณ ${hhmm(summary.endsAt)} น.`
						: 'ตกต่อเนื่องเกิน 2 ชั่วโมงข้างหน้า',
					heavy: summary.heavy,
					rain: true
				};
			case 'starts':
				return {
					lead: 'ฝนน่าจะเริ่มตก',
					main: `${hhmm(summary.startsAt)} น.`,
					detail: `ตกราว ${durationText(summary.startsAt, summary.endsAt ?? horizonEnd)}${summary.endsAt ? ` หยุดประมาณ ${hhmm(summary.endsAt)}` : ' ขึ้นไป'}`,
					heavy: summary.heavy,
					rain: true
				};
			case 'maybe':
				return {
					lead: 'ไม่น่ามีฝนมาก',
					main: `อาจมีฝนช่วง ${hhmm(summary.at)}`,
					detail: 'โอกาสยังต่ำ ติดตามรอบถัดไป',
					heavy: null,
					rain: false
				};
			default:
				return {
					lead: '2 ชั่วโมงข้างหน้า',
					main: 'ไม่น่ามีฝน',
					detail: '',
					heavy: null,
					rain: false
				};
		}
	});
</script>

<section
	class="flex flex-col gap-3.5 rounded-2xl bg-answer p-4 lg:p-5"
	aria-label="สรุปฝนที่ตำบล{area.name_th}"
>
	<div class="flex items-center gap-3.5">
		<span
			class={[
				'grid shrink-0 place-items-center rounded-[14px]',
				size === 'lg' ? 'size-14' : 'size-12',
				view.rain ? 'bg-[#2f6fb0] text-white' : 'bg-[#eef1f3] text-muted-foreground'
			]}
		>
			{#if view.rain}<CloudRain size={26} aria-hidden="true" />{:else}<Sun
					size={26}
					aria-hidden="true"
				/>{/if}
		</span>
		<div class="leading-tight">
			<p class="text-[15px] text-[#33424b]">{view.lead}</p>
			<p class={['font-bold', size === 'lg' ? 'text-4xl lg:text-5xl' : 'text-[32px]']}>
				{view.main}
			</p>
		</div>
	</div>
	{#if view.detail || view.heavy}
		<p class="text-base leading-normal">
			{view.detail}
			{#if view.heavy}
				<br /><strong class="text-[#5b3c9e]"
					>ช่วง {hhmm(view.heavy.from)}–{hhmm(view.heavy.to)} อาจตกหนัก</strong
				>
			{/if}
		</p>
	{/if}
	<RainBars steps={area.steps} {issuedAt} height={size === 'lg' ? 72 : 52} />
</section>
