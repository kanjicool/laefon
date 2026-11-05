<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="mx-auto flex max-w-[560px] flex-col items-start gap-4 px-4 py-16">
	<p class="text-sm font-semibold text-primary">ข้อผิดพลาด {page.status}</p>
	<h1 class="text-2xl font-bold">{page.error?.message ?? 'เกิดข้อผิดพลาด'}</h1>
	<div class="flex gap-2">
		<button
			type="button"
			onclick={() => location.reload()}
			class="h-11 rounded-xl bg-primary px-4 text-primary-foreground">ลองใหม่</button
		>
		<a
			href="/"
			class="grid h-11 place-items-center rounded-xl border border-input px-4 text-foreground no-underline"
			>กลับหน้าหลัก</a
		>
	</div>
</div>
