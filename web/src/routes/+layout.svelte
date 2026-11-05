<script lang="ts">
	import '../app.css';
	import SiteHeader from '$lib/components/layout/SiteHeader.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>แลฝน — ฝนรายตำบล สงขลา</title>
	<meta
		name="description"
		content="ดูว่าฝนจะตกที่ตำบลของคุณกี่โมง ล่วงหน้า 2 ชั่วโมง จังหวัดสงขลา จากภาพเรดาร์ตรวจอากาศ"
	/>
</svelte:head>

<div class="flex min-h-svh flex-col lg:h-svh">
	<SiteHeader />
	{@render children()}
</div>
