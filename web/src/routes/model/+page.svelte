<script lang="ts">
	import Notice from '$lib/components/layout/Notice.svelte';
	import SiteFooter from '$lib/components/layout/SiteFooter.svelte';
	import SkillChart from '$lib/features/model-eval/ui/SkillChart.svelte';

	let { data } = $props();

	let threshold = $state(1);
	const DESC: Record<string, string> = {
		unet: 'Deep Learning ที่เรียนรูปแบบการเคลื่อนและก่อตัวของฝนจากภาพเรดาร์ย้อนหลัง',
		optical_flow: 'ดูทิศทางที่กลุ่มฝนเคลื่อน แล้วเลื่อนภาพล่าสุดไปข้างหน้า (pySTEPS)',
		persistence: 'สมมติว่าฝนอยู่ที่เดิม ใช้ภาพล่าสุดเป็นคำทำนาย เป็นเส้นฐานขั้นต่ำ'
	};
	const hasUnet = $derived(data.metrics.models.some((m) => m.id === 'unet'));
	const at60 = $derived(
		data.metrics.models.map((m) => ({
			...m,
			csi60: m.by_lead.find((r) => r.lead_min === 60 && r.threshold_mmh === threshold)?.csi
		}))
	);
</script>

<svelte:head><title>ความแม่นยำของโมเดล — แลฝน</title></svelte:head>

{#if data.metrics.is_mock}
	<Notice
		><strong>ตัวเลขจำลอง</strong> — วัด baseline บนข้อมูลจำลองเพื่อทดสอบหน้าจอ ยังไม่ใช่ผลวัดจากเรดาร์สทิงพระจริง
		ผลของ U-Net จะขึ้นเมื่อเทรนด้วยข้อมูลจริงแล้ว</Notice
	>
{/if}

<div class="mx-auto flex w-full max-w-[1180px] flex-col gap-7 px-4 py-8 lg:px-6">
	<section class="flex max-w-[780px] flex-col gap-2.5">
		<p class="text-sm font-semibold tracking-wide text-primary">ส่วน AI ของโครงงาน</p>
		<h1 class="text-3xl leading-snug font-bold lg:text-4xl">ทำนายฝนล่วงหน้าได้แม่นแค่ไหน</h1>
		<p class="text-[17px] leading-relaxed text-[#33424b]">
			เทียบโมเดลของเรากับวิธีมาตรฐาน 2 วิธี บนช่วงทดสอบที่โมเดลไม่เคยเห็น ({data.metrics
				.test_period_th})
		</p>
	</section>

	<div role="group" aria-label="เกณฑ์ฝน" class="flex gap-1 self-start rounded-[10px] bg-muted p-1">
		{#each [1, 5] as t (t)}
			<button
				type="button"
				aria-pressed={threshold === t}
				onclick={() => (threshold = t)}
				class={[
					'rounded-[7px] px-3 py-1.5 text-sm',
					threshold === t ? 'bg-card font-semibold shadow-sm' : 'text-muted-foreground'
				]}>ฝน ≥ {t} มม./ชม.</button
			>
		{/each}
	</div>

	<section class="grid gap-4 md:grid-cols-3">
		{#if !hasUnet}
			<div
				class="flex flex-col gap-2 rounded-2xl border-2 border-dashed border-primary bg-card p-5"
			>
				<strong class="text-base">U-Net (โมเดลของเรา)</strong>
				<p class="text-sm leading-relaxed text-muted-foreground">{DESC.unet}</p>
				<p class="mt-1 text-[13px] text-[#33424b]">
					CSI ที่ 60 นาที <strong class="block text-2xl text-muted-foreground">รอผล</strong>
				</p>
				<p class="text-xs text-muted-foreground">วัดได้หลังเทรนด้วยข้อมูลเรดาร์สทิงพระจริง</p>
			</div>
		{/if}
		{#each at60 as m (m.id)}
			<div
				class={[
					'flex flex-col gap-2 rounded-2xl bg-card p-5',
					m.id === 'unet' ? 'border-2 border-primary' : 'border'
				]}
			>
				<strong class="text-base">{m.name_th}</strong>
				<p class="text-sm leading-relaxed text-muted-foreground">{DESC[m.id] ?? ''}</p>
				<p class="mt-1 text-[13px] text-[#33424b]">
					CSI ที่ 60 นาที <strong class="block text-2xl text-foreground"
						>{m.csi60?.toFixed(2) ?? '—'}</strong
					>
				</p>
			</div>
		{/each}
	</section>

	<figure class="flex flex-col gap-3 rounded-[20px] border bg-card p-5 lg:p-6">
		<figcaption>
			<strong class="block text-lg">ความแม่นยำลดลงตามระยะที่ทำนาย</strong>
			<span class="text-sm text-muted-foreground"
				>CSI (Critical Success Index) 0–1 ยิ่งสูงยิ่งดี</span
			>
		</figcaption>
		<SkillChart metrics={data.metrics} {threshold} />
	</figure>

	<section class="grid gap-4 md:grid-cols-3">
		<div class="rounded-2xl border bg-card p-5">
			<h2 class="mb-1.5 font-semibold">ข้อมูล</h2>
			<p class="text-sm leading-relaxed text-[#33424b]">
				ภาพเรดาร์สทิงพระทุก 15 นาที และค่าฝนจากสถานี AWS ในสงขลา [รอข้อมูลจริง]
			</p>
		</div>
		<div class="rounded-2xl border bg-card p-5">
			<h2 class="mb-1.5 font-semibold">วิธีแบ่งข้อมูล</h2>
			<p class="text-sm leading-relaxed text-[#33424b]">
				แบ่งตามเวลา เทรนด้วยปีก่อนหน้า ทดสอบด้วยมรสุมปีล่าสุด กันภาพที่เวลาใกล้กันรั่วข้ามชุด
			</p>
		</div>
		<div class="rounded-2xl border bg-card p-5">
			<h2 class="mb-1.5 font-semibold">ข้อจำกัด</h2>
			<p class="text-sm leading-relaxed text-[#33424b]">
				ฝนที่ก่อตัวใหม่เร็วมากยังทายยาก ความแม่นลดลงไกลจากเรดาร์และหลังภูเขา
			</p>
		</div>
	</section>
	<SiteFooter />
</div>
