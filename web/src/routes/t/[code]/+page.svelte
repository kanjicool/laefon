<script lang="ts">
	import Copy from '@lucide/svelte/icons/copy';
	import { page } from '$app/state';
	import Notice from '$lib/components/layout/Notice.svelte';
	import SiteFooter from '$lib/components/layout/SiteFooter.svelte';
	import { isRaining } from '$lib/features/forecast/domain/wording';
	import AnswerCard from '$lib/features/forecast/ui/AnswerCard.svelte';
	import StepTable from '$lib/features/forecast/ui/StepTable.svelte';
	import { addMinutes, hhmm } from '$lib/utils/time';

	let { data } = $props();

	let copied = $state(false);
	const url = $derived(page.url.href);
	const title = $derived(`ฝนที่ ต.${data.area.name_th} อ.${data.area.district_th} — แลฝน`);

	const nearby = $derived(
		data.nearby.map((a) => {
			const i = a.steps.findIndex((s) => isRaining(s.p_rain));
			return {
				code: a.area_code,
				name: a.name_th,
				when:
					i === 0
						? 'ตกอยู่'
						: i > 0
							? hhmm(addMinutes(data.issued_at, a.steps[i].lead_min - 15))
							: 'ไม่น่าตก'
			};
		})
	);

	async function copy() {
		await navigator.clipboard.writeText(url);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head>
	<title>{title}</title>
	<meta property="og:title" content={title} />
	<meta property="og:description" content="ดูว่าฝนจะตกกี่โมง ล่วงหน้า 2 ชั่วโมง ทุก 15 นาที" />
</svelte:head>

{#if data.is_mock}
	<Notice><strong>ข้อมูลจำลองเพื่อสาธิต</strong> — ยังไม่ใช่คำพยากรณ์จริง</Notice>
{/if}

<div class="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8">
	<nav aria-label="breadcrumb" class="flex gap-2 text-sm text-muted-foreground">
		<a href="/" class="text-primary no-underline">สงขลา</a><span>/</span><span
			>อ.{data.area.district_th}</span
		><span>/</span><span class="text-foreground">ต.{data.area.name_th}</span>
	</nav>

	<section class="flex flex-col gap-5 rounded-[20px] border bg-card p-5 lg:p-7">
		<div class="flex flex-wrap items-start gap-3">
			<div class="flex-1">
				<h1 class="text-3xl font-bold lg:text-[34px]">ตำบล{data.area.name_th}</h1>
				<p class="text-base text-muted-foreground">อำเภอ{data.area.district_th} จังหวัดสงขลา</p>
			</div>
			<a
				href="https://social-plugins.line.me/lineit/share?url={encodeURIComponent(url)}"
				target="_blank"
				rel="noopener"
				class="flex h-11 items-center rounded-xl bg-line-green px-4 text-[15px] font-semibold text-white no-underline"
				>แชร์ลง LINE</a
			>
			<button
				type="button"
				onclick={copy}
				class="flex h-11 items-center gap-2 rounded-xl border border-input px-4 text-[15px]"
			>
				<Copy size={16} aria-hidden="true" />{copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
			</button>
		</div>
		<AnswerCard
			area={data.area}
			issuedAt={data.issued_at}
			stepMinutes={data.step_minutes}
			size="lg"
		/>
		<p class="text-[13px] text-muted-foreground">
			ข้อมูลเรดาร์สทิงพระ {hhmm(data.issued_at)} · อัปเดตทุก {data.step_minutes} นาที · {data.model
				.name_th}
		</p>
	</section>

	<div class="grid gap-6 lg:grid-cols-[3fr_2fr]">
		<section class="rounded-[20px] border bg-card p-5 lg:p-6">
			<h2 class="mb-3 text-lg font-semibold">คาดการณ์ทุก 15 นาที</h2>
			<StepTable steps={data.area.steps} issuedAt={data.issued_at} showHeavy />
		</section>
		<div class="flex flex-col gap-6">
			<section class="rounded-[20px] border bg-card p-5 lg:p-6">
				<h2 class="mb-2 text-lg font-semibold">ตำบลอื่นใน อ.{data.area.district_th}</h2>
				<ul>
					{#each nearby as n (n.code)}
						<li>
							<a
								href="/t/{n.code}"
								class="flex justify-between border-t border-muted py-2.5 text-foreground no-underline hover:text-primary"
							>
								<span>ต.{n.name}</span><strong>{n.when}</strong>
							</a>
						</li>
					{/each}
				</ul>
				<a href="/?t={data.area.area_code}" class="mt-3 inline-block text-[15px] text-primary"
					>ดูบนแผนที่ทั้งจังหวัด</a
				>
			</section>
			<section class="flex flex-col gap-2 rounded-[20px] border bg-card p-5 lg:p-6">
				<h2 class="text-lg font-semibold">อ่านค่านี้ยังไง</h2>
				<p class="text-[15px] leading-relaxed text-[#33424b]">
					"น่าจะตก" แปลว่าสถานการณ์แบบนี้ 10 ครั้ง ฝนตกจริงราว 5–7 ครั้ง ยิ่งดูไกลเวลา
					ความแม่นยิ่งลดลง
				</p>
				<a href="/about" class="text-[15px] text-primary">วิธีอ่านทั้งหมด</a>
			</section>
		</div>
	</div>
	<SiteFooter />
</div>
