<script lang="ts">
	import type { MetricsFile } from '$lib/features/forecast/domain/types';

	let { metrics, threshold }: { metrics: MetricsFile; threshold: number } = $props();

	const STYLE: Record<string, { color: string; dash: string; width: number }> = {
		unet: { color: '#0f5f73', dash: '', width: 3 },
		optical_flow: { color: '#e8590c', dash: '', width: 2.5 },
		persistence: { color: '#7d8d97', dash: '6 5', width: 2.5 }
	};
	const W = 640;
	const H = 300;
	const [x0, x1, y0, y1] = [56, 600, 20, 260];

	const series = $derived(
		metrics.models.map((m) => {
			const rows = m.by_lead.filter((r) => r.threshold_mmh === threshold);
			const leads = rows.map((r) => r.lead_min);
			const minL = Math.min(...leads);
			const maxL = Math.max(...leads);
			const x = (l: number) => x0 + ((l - minL) / Math.max(maxL - minL, 1)) * (x1 - x0);
			const y = (v: number) => y1 - v * (y1 - y0);
			const pts = rows.map((r) => [x(r.lead_min), y(r.csi)] as const);
			return {
				id: m.id,
				name: m.name_th,
				...(STYLE[m.id] ?? { color: '#14212b', dash: '', width: 2 }),
				points: pts.map((p) => p.join(',')).join(' '),
				last: pts.at(-1) ?? [0, 0],
				ticks: rows.map((r) => ({ lead: r.lead_min, x: x(r.lead_min) }))
			};
		})
	);
	const ticks = $derived(series[0]?.ticks ?? []);
	const desc = $derived(
		series.map((s) => s.name).join(', ') + ` — CSI ที่เกณฑ์ ${threshold} มม./ชม. ตามระยะทำนาย`
	);
</script>

<svg viewBox="0 0 {W} {H}" class="h-auto w-full" role="img" aria-label={desc}>
	{#each [0, 0.2, 0.4, 0.6, 0.8, 1] as v (v)}
		<line
			x1={x0}
			x2={x1}
			y1={y1 - v * (y1 - y0)}
			y2={y1 - v * (y1 - y0)}
			stroke={v === 0 ? '#9aa8b1' : '#e3e9ed'}
		/>
		<text x={x0 - 10} y={y1 - v * (y1 - y0) + 4} text-anchor="end" font-size="12" fill="#5a6b76"
			>{v.toFixed(1)}</text
		>
	{/each}
	{#each ticks as t (t.lead)}
		<text x={t.x} y={H - 16} text-anchor="middle" font-size="12" fill="#5a6b76">{t.lead}</text>
	{/each}
	<text x={x1} y={H - 1} text-anchor="end" font-size="12" fill="#5a6b76">ทำนายล่วงหน้า (นาที)</text>
	{#each series as s (s.id)}
		<polyline
			points={s.points}
			fill="none"
			stroke={s.color}
			stroke-width={s.width}
			stroke-dasharray={s.dash}
			stroke-linejoin="round"
		/>
		{#each s.points.split(' ') as p (p)}
			<circle cx={p.split(',')[0]} cy={p.split(',')[1]} r="3" fill={s.color} />
		{/each}
	{/each}
</svg>
<ul class="mt-2 flex flex-wrap gap-4 text-sm">
	{#each series as s (s.id)}
		<li class="flex items-center gap-2">
			<svg width="22" height="6" aria-hidden="true"
				><line
					x1="0"
					x2="22"
					y1="3"
					y2="3"
					stroke={s.color}
					stroke-width="3"
					stroke-dasharray={s.dash}
				/></svg
			>
			{s.name}
		</li>
	{/each}
</ul>
