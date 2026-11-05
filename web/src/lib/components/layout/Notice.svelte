<script lang="ts">
	import type { Snippet } from 'svelte';

	let { tone = 'warn', children }: { tone?: 'warn' | 'info'; children: Snippet } = $props();
</script>

<div
	role="status"
	class={[
		'border-b px-4 py-2 text-sm lg:px-6',
		tone === 'warn'
			? 'border-[#f1e0ae] bg-warn-bg text-warn-fg'
			: 'border-[#c8e0e7] bg-info-bg text-info-fg'
	]}
>
	{@render children()}
</div>
