<script lang="ts">
	import { addTodo } from '$lib/stores/todos.svelte.js';
	import { listsState, isSeparator } from '$lib/stores/lists.svelte.js';
	import { todayLocalStr } from '$lib/date.js';

	// In `todayMode` the trailing control picks the destination *list* instead of a
	// date: the Today view spans lists, and everything added there is dated today.
	let { listId, todayMode = false }: { listId?: string; todayMode?: boolean } = $props();

	let title = $state('');
	let date = $state(todayLocalStr());
	let dateInputEl: HTMLInputElement | undefined = $state();

	let selectableLists = $derived(listsState.items.filter((l) => !isSeparator(l)));

	// Defaults to whichever list the user was last on, until they pick one here.
	let pickedListId = $state<string | null>(null);
	let targetListId = $derived(
		selectableLists.find((l) => l.id === pickedListId)?.id ??
			selectableLists.find((l) => l.id === listsState.selectedId)?.id ??
			selectableLists[0]?.id ??
			null
	);
	let targetListName = $derived(
		selectableLists.find((l) => l.id === targetListId)?.name ?? 'Select a list'
	);

	let showListMenu = $state(false);

	function pickList(id: string) {
		pickedListId = id;
		showListMenu = false;
	}

	function closeListMenu(e: MouseEvent) {
		if (showListMenu && !(e.target as HTMLElement).closest('.list-picker')) {
			showListMenu = false;
		}
	}

	let dateLabel = $derived.by(() => {
		if (date === todayLocalStr()) return 'Today';
		const dt = new Date(`${date}T00:00:00`);
		const day = String(dt.getDate()).padStart(2, '0');
		const month = dt.toLocaleDateString('en-US', { month: 'long' });
		return `${day} ${month} ${dt.getFullYear()}`;
	});

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const target = todayMode ? targetListId : listId;
		if (!title.trim() || !target) return;
		addTodo(target, title.trim(), todayMode ? todayLocalStr() : date);
		title = '';
	}

	function openDatePicker() {
		if (!dateInputEl) return;
		if (typeof dateInputEl.showPicker === 'function') dateInputEl.showPicker();
		else dateInputEl.focus();
	}
</script>

<svelte:window onclickcapture={closeListMenu} />

<form class="card input-row" onsubmit={handleSubmit}>
	<svg class="icon plus-icon" viewBox="0 0 24 24"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
	<input type="text" placeholder="Add a todo…" bind:value={title} />

	{#if todayMode}
		<div class="list-picker">
			<button type="button" class="btn-ghost date-trigger" onclick={() => (showListMenu = !showListMenu)}>
				<svg class="icon" viewBox="0 0 24 24"><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></svg>
				<span class="picker-label">{targetListName}</span>
			</button>
			{#if showListMenu}
				<div class="popover card">
					{#each listsState.items as list (list.id)}
						{#if isSeparator(list)}
							<hr class="picker-separator" />
						{:else}
							<button type="button" class="popover-item" onclick={() => pickList(list.id)}>
								{list.name}
							</button>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<button type="button" class="btn-ghost date-trigger" onclick={openDatePicker}>
			<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="M8 2v4" /><path d="M16 2v4" /></svg>
			<span>{dateLabel}</span>
		</button>
		<input type="date" class="date-input" bind:value={date} bind:this={dateInputEl} />
	{/if}
</form>

<style>
	.input-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 8px var(--space-3);
	}

	.plus-icon {
		color: var(--fg-subtle);
	}

	.input-row input[type='text'] {
		flex: 1;
		min-width: 0;
		border: none;
		padding: 4px 0;
	}

	.input-row input[type='text']:focus-visible {
		box-shadow: none;
	}

	.date-input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	.date-trigger {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
		font-size: 13px;
		white-space: nowrap;
		padding: 6px 10px;
	}

	.list-picker {
		position: relative;
		flex-shrink: 0;
	}

	/* Long list names shouldn't push the text input out of the row. */
	.picker-label {
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Fit ten lists before scrolling: 10 rows of 32px + 9 gaps of 8px + 16px of
	   container padding, plus headroom for a couple of interleaved separators.
	   Capped against the viewport so a short window can't run the dropdown off
	   the bottom of the screen. */
	.list-picker .popover {
		max-height: min(430px, 60vh);
		overflow-y: auto;
	}

	.picker-separator {
		border: none;
		border-top: 1px solid var(--border-hover);
		margin: 0;
	}
</style>
