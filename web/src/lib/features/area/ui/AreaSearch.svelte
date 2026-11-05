<script lang="ts">
	import LocateFixed from '@lucide/svelte/icons/locate-fixed';
	import Search from '@lucide/svelte/icons/search';
	import { searchAreas, type Searchable } from '../domain/search';

	let {
		areas,
		onselect,
		onlocate
	}: { areas: Searchable[]; onselect: (code: string) => void; onlocate?: () => void } = $props();

	let query = $state('');
	let active = $state(0);
	const results = $derived(searchAreas(areas, query));
	const listId = 'area-search-results';

	function choose(code: string) {
		query = '';
		onselect(code);
	}

	function onkeydown(e: KeyboardEvent) {
		if (!results.length) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			active = (active + 1) % results.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = (active - 1 + results.length) % results.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			choose(results[active].area_code);
		} else if (e.key === 'Escape') query = '';
	}
</script>

<div class="relative flex gap-2">
	<label
		class="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border border-input bg-card px-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
	>
		<Search size={18} class="text-muted-foreground" aria-hidden="true" />
		<span class="sr-only">ค้นหาตำบลหรืออำเภอ</span>
		<input
			type="search"
			bind:value={query}
			oninput={() => (active = 0)}
			{onkeydown}
			placeholder="ค้นหาตำบลหรืออำเภอ"
			autocomplete="off"
			role="combobox"
			aria-expanded={results.length > 0}
			aria-controls={listId}
			aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
			class="min-w-0 flex-1 bg-transparent text-base outline-none"
		/>
	</label>
	{#if onlocate}
		<button
			type="button"
			onclick={onlocate}
			class="flex h-12 items-center gap-1.5 rounded-xl border border-input bg-card px-3.5 text-[15px] whitespace-nowrap"
		>
			<LocateFixed size={18} class="text-primary" aria-hidden="true" /><span
				class="hidden sm:inline">ใกล้ฉัน</span
			><span class="sr-only sm:hidden">ใช้ตำแหน่งของฉัน</span>
		</button>
	{/if}
	{#if results.length}
		<ul
			id={listId}
			role="listbox"
			class="absolute top-[52px] right-0 left-0 z-20 overflow-hidden rounded-xl border bg-card shadow-lg"
		>
			{#each results as area, i (area.area_code)}
				<li id="{listId}-{i}" role="option" aria-selected={i === active}>
					<button
						type="button"
						onclick={() => choose(area.area_code)}
						onmouseenter={() => (active = i)}
						class={['flex w-full flex-col px-4 py-2.5 text-left', i === active && 'bg-muted']}
					>
						<span class="font-semibold">ต.{area.name_th}</span>
						<span class="text-[13px] text-muted-foreground">อ.{area.district_th}</span>
					</button>
				</li>
			{/each}
		</ul>
	{:else if query.trim()}
		<p
			class="absolute top-[52px] right-0 left-0 z-20 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-lg"
		>
			ไม่พบตำบลที่ตรงกับ "{query}" — ตอนนี้ครอบคลุมเฉพาะจังหวัดสงขลา
		</p>
	{/if}
</div>
