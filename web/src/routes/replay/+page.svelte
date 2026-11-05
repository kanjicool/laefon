<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Notice from '$lib/components/layout/Notice.svelte';
	import ForecastExplorer from '$lib/features/explorer/ui/ForecastExplorer.svelte';
	import { dayMonth, hhmm } from '$lib/utils/time';

	let { data } = $props();

	const runIdx = $derived(data.event.runs.indexOf(data.run));
	const href = (event: string, run?: string) => `/replay?event=${event}${run ? `&run=${run}` : ''}`;
	const runLabel = (run: string) => `${run.slice(0, 2)}:${run.slice(2)}`;
</script>

<svelte:head><title>ย้อนดูเหตุการณ์ — แลฝน</title></svelte:head>

<Notice tone="info">
	<strong>กำลังย้อนดูเหตุการณ์ในอดีต</strong> — ข้อมูลบนจอนี้ไม่ใช่สถานการณ์ตอนนี้{#if data.forecast.is_mock}
		· เหตุการณ์จำลองเพื่อสาธิต{/if}
</Notice>

{#key `${data.event.id}/${data.run}`}
	<ForecastExplorer forecast={data.forecast} radar={data.radar} mode="replay">
		{#snippet panelTop()}
			<section class="flex flex-col gap-2">
				<h1 class="text-xl font-bold">เลือกเหตุการณ์ฝน</h1>
				<p class="text-sm text-muted-foreground">
					เล่นภาพเรดาร์ที่เกิดจริงเทียบกับที่โมเดลทำนายไว้ ณ เวลานั้น
				</p>
				{#each data.index.events as ev (ev.id)}
					<a
						href={href(ev.id)}
						data-sveltekit-noscroll
						aria-current={ev.id === data.event.id ? 'true' : undefined}
						class={[
							'flex flex-col gap-0.5 rounded-xl px-3.5 py-3 text-foreground no-underline',
							ev.id === data.event.id
								? 'border-2 border-primary bg-[#eef6f8]'
								: 'border hover:bg-muted/60'
						]}
					>
						<span class="text-[15px] font-semibold">{ev.title_th}</span>
						<span class="text-[13px] text-muted-foreground">{ev.description_th}</span>
					</a>
				{/each}
			</section>
			<section class="flex flex-col gap-2 rounded-2xl border p-3.5">
				<h2 class="text-[15px] font-semibold">
					รอบทำนาย {dayMonth(data.forecast.issued_at)} · {hhmm(data.forecast.issued_at)}
				</h2>
				<div class="flex items-center gap-2">
					<a
						href={runIdx > 0 ? href(data.event.id, data.event.runs[runIdx - 1]) : undefined}
						aria-disabled={runIdx <= 0}
						aria-label="รอบก่อนหน้า"
						data-sveltekit-noscroll
						class={[
							'grid size-11 place-items-center rounded-xl border',
							runIdx <= 0 && 'pointer-events-none opacity-40'
						]}><ChevronLeft size={18} /></a
					>
					<div class="flex flex-1 flex-wrap gap-1">
						{#each data.event.runs as run (run)}
							<a
								href={href(data.event.id, run)}
								data-sveltekit-noscroll
								aria-current={run === data.run ? 'true' : undefined}
								class={[
									'rounded-md px-1.5 py-1 text-xs no-underline',
									run === data.run
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-foreground'
								]}>{runLabel(run)}</a
							>
						{/each}
					</div>
					<a
						href={runIdx < data.event.runs.length - 1
							? href(data.event.id, data.event.runs[runIdx + 1])
							: undefined}
						aria-disabled={runIdx >= data.event.runs.length - 1}
						aria-label="รอบถัดไป"
						data-sveltekit-noscroll
						class={[
							'grid size-11 place-items-center rounded-xl border',
							runIdx >= data.event.runs.length - 1 && 'pointer-events-none opacity-40'
						]}><ChevronRight size={18} /></a
					>
				</div>
			</section>
		{/snippet}
	</ForecastExplorer>
{/key}
