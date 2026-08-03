<script lang="ts">
	import { addTodo } from '$lib/stores/todos.svelte.js';
	import { todayLocalStr } from '$lib/date.js';

	let { listId }: { listId: string | undefined } = $props();

	let title = $state('');
	let date = $state(todayLocalStr());
	let dateInputEl: HTMLInputElement | undefined = $state();

	let dateLabel = $derived.by(() => {
		if (date === todayLocalStr()) return 'Today';
		const dt = new Date(`${date}T00:00:00`);
		const day = String(dt.getDate()).padStart(2, '0');
		const month = dt.toLocaleDateString('en-US', { month: 'long' });
		return `${day} ${month} ${dt.getFullYear()}`;
	});

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!title.trim() || !listId) return;
		addTodo(listId, title.trim(), date);
		title = '';
	}

	function openDatePicker() {
		if (!dateInputEl) return;
		if (typeof dateInputEl.showPicker === 'function') dateInputEl.showPicker();
		else dateInputEl.focus();
	}
</script>

<form class="card input-row" onsubmit={handleSubmit}>
	<svg class="icon plus-icon" viewBox="0 0 24 24"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
	<input type="text" placeholder="Add a todo…" bind:value={title} />

	<button type="button" class="btn-ghost date-trigger" onclick={openDatePicker}>
		<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="M8 2v4" /><path d="M16 2v4" /></svg>
		<span>{dateLabel}</span>
	</button>
	<input type="date" class="date-input" bind:value={date} bind:this={dateInputEl} />
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
</style>
