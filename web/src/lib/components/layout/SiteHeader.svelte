<script lang="ts">
	import { page } from '$app/state';

	const nav = [
		{ href: '/', label: 'ล่าสุด' },
		{ href: '/replay', label: 'ย้อนดูเหตุการณ์' }
	];
	const links = [
		{ href: '/model', label: 'ความแม่นยำของโมเดล' },
		{ href: '/about', label: 'วิธีอ่าน' }
	];

	const isActive = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<header
	class="flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 border-b bg-card px-4 py-2 lg:h-16 lg:px-6"
>
	<a href="/" class="flex items-center gap-2.5 text-foreground no-underline">
		<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
			<rect width="30" height="30" rx="8" fill="var(--primary)" />
			<path d="M15 6c3.5 4.6 6 8.2 6 11.2a6 6 0 0 1-12 0C9 14.2 11.5 10.6 15 6z" fill="#fff" />
		</svg>
		<span class="flex flex-col leading-tight">
			<strong class="text-xl font-bold">แลฝน</strong>
			<span class="hidden text-xs text-muted-foreground sm:block">ฝนรายตำบล จังหวัดสงขลา</span>
		</span>
	</a>

	<nav aria-label="โหมดข้อมูล" class="flex gap-1 rounded-[10px] bg-muted p-1">
		{#each nav as item (item.href)}
			<a
				href={item.href}
				aria-current={isActive(item.href) ? 'page' : undefined}
				class={[
					'rounded-[7px] px-3.5 py-1.5 text-sm no-underline',
					isActive(item.href)
						? 'bg-card font-semibold text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'
				]}>{item.label}</a
			>
		{/each}
	</nav>

	<nav aria-label="เมนู" class="ml-auto flex items-center gap-5 text-[15px]">
		{#each links as item (item.href)}
			<a
				href={item.href}
				aria-current={isActive(item.href) ? 'page' : undefined}
				class={[
					'no-underline',
					isActive(item.href) ? 'font-semibold text-foreground' : 'text-primary hover:underline'
				]}>{item.label}</a
			>
		{/each}
	</nav>
</header>
