<script lang="ts">
	import SiteFooter from '$lib/components/layout/SiteFooter.svelte';
	import { RAIN_LEVELS, type RainLevel } from '$lib/features/forecast/domain/wording';

	const levels: { level: RainLevel; rule: string }[] = [
		{ level: 0, rule: 'โอกาสฝนต่ำกว่า 20%' },
		{ level: 1, rule: 'โอกาส 20–45%' },
		{ level: 2, rule: 'โอกาส 45–70% — นับว่า "ฝนน่าจะเริ่มตก" ตั้งแต่ขั้นนี้' },
		{ level: 3, rule: 'โอกาส 70% ขึ้นไป' },
		{ level: 4, rule: 'โอกาสฝนหนัก (≥ 5 มม./ชม.) 50% ขึ้นไป' }
	];
</script>

<svelte:head><title>วิธีอ่าน — แลฝน</title></svelte:head>

<div class="mx-auto flex w-full max-w-[780px] flex-col gap-6 px-4 py-8">
	<h1 class="text-3xl font-bold">วิธีอ่านแลฝน</h1>
	<section class="flex flex-col gap-3">
		<h2 class="text-xl font-semibold">คำที่ใช้บอกโอกาสฝน</h2>
		{#each levels as l (l.level)}
			<div
				class="flex items-center gap-3 rounded-xl px-3.5 py-3"
				style:background={RAIN_LEVELS[l.level].color}
				style:color={RAIN_LEVELS[l.level].onColor}
			>
				<strong class="w-32 shrink-0">{RAIN_LEVELS[l.level].word}</strong><span class="text-sm"
					>{l.rule}</span
				>
			</div>
		{/each}
		<p class="leading-relaxed text-[#33424b]">
			"โอกาส 70%" แปลว่าสถานการณ์แบบนี้ 10 ครั้ง ฝนตกจริงราว 7 ครั้ง ยิ่งดูไกลจากตอนนี้
			ความแม่นยิ่งลดลง
		</p>
	</section>
	<section class="flex flex-col gap-2">
		<h2 class="text-xl font-semibold">ข้อมูลมาจากไหน</h2>
		<p class="leading-relaxed text-[#33424b]">
			ภาพเรดาร์ตรวจอากาศสถานีสทิงพระ สแกนทุก 15 นาที นำมาให้โมเดล AI ทำนายต่อไปข้างหน้า 2 ชั่วโมง
			แล้วสรุปเป็นรายตำบล ตอนนี้อยู่ระหว่างพัฒนา ข้อมูลบนเว็บเป็นข้อมูลจำลอง
		</p>
	</section>
	<section class="flex flex-col gap-2">
		<h2 class="text-xl font-semibold">ข้อควรรู้</h2>
		<ul class="list-disc space-y-1 pl-5 leading-relaxed text-[#33424b]">
			<li>เว็บนี้ไม่ใช่ประกาศทางการของกรมอุตุนิยมวิทยา ติดตามประกาศทางการที่สายด่วน 1182</li>
			<li>ฝนที่ก่อตัวใหม่อย่างรวดเร็วอาจทำนายไม่ทัน</li>
			<li>ความแม่นลดลงในพื้นที่ไกลจากเรดาร์และหลังภูเขา</li>
		</ul>
	</section>
	<SiteFooter />
</div>
