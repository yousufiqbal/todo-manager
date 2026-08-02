<script lang="ts">
	import { addTodo } from '$lib/stores/todos.svelte.js';

	let { listId }: { listId: string | undefined } = $props();

	function todayStr() {
		return new Date().toISOString().slice(0, 10);
	}

	let title = $state('');
	let date = $state(todayStr());
	let dateInputEl: HTMLInputElement | undefined = $state();

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

	<button type="button" class="btn-ghost date-trigger" onclick={openDatePicker} aria-label="Pick date">
		<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="M8 2v4" /><path d="M16 2v4" /></svg>
	</button>
	<input type="date" class="date-input" bind:value={date} bind:this={dateInputEl} />
</form>

<style>
	.input-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
	}

	.plus-icon {
		color: var(--fg-subtle);
	}

	.input-row input[type='text'] {
		flex: 1;
		min-width: 0;
		border: none;
		padding: 6px 0;
	}

	.input-row input[type='text']:focus-visible {
		box-shadow: none;
	}

	.date-input {
		color: var(--fg-muted);
	}

	.date-trigger {
		display: none;
		flex-shrink: 0;
	}

	@media (max-width: 480px) {
		.date-input {
			position: absolute;
			width: 1px;
			height: 1px;
			opacity: 0;
			pointer-events: none;
		}

		.date-trigger {
			display: inline-flex;
		}
	}
</style>
