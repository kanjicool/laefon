<script lang="ts">
	import Notice from '$lib/components/layout/Notice.svelte';
	import ForecastExplorer from '$lib/features/explorer/ui/ForecastExplorer.svelte';
	import { hhmm, minutesSince } from '$lib/utils/time';

	let { data } = $props();

	const stale = $derived(minutesSince(data.forecast.issued_at) > 30);
</script>

{#if data.forecast.is_mock}
	<Notice><strong>ข้อมูลจำลองเพื่อสาธิต</strong> — ยังไม่ใช่คำพยากรณ์จริง</Notice>
{/if}
{#if stale}
	<Notice>
		<strong>ข้อมูลล่าสุดเมื่อ {hhmm(data.forecast.issued_at)}</strong> — ยังไม่ได้ภาพเรดาร์รอบใหม่ ค่าที่เห็นอาจไม่ตรงกับตอนนี้
	</Notice>
{/if}

<ForecastExplorer forecast={data.forecast} radar={data.radar} mode="latest" />
