<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>แลฝน</title>
	<meta name="description" content="ดูโอกาสฝนตกล่วงหน้า 2 ชั่วโมง รายตำบล จังหวัดสงขลา" />
</svelte:head>

{@render children()}
