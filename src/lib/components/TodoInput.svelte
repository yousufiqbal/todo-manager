<script lang="ts">
	import { addTodo } from '$lib/stores/todos.svelte.js';

	let { listId }: { listId: string | undefined } = $props();

	function todayStr() {
		return new Date().toISOString().slice(0, 10);
	}

	let title = $state('');
	let date = $state(todayStr());

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!title.trim() || !listId) return;
		addTodo(listId, title.trim(), date);
		title = '';
	}
</script>

<form class="card input-row" onsubmit={handleSubmit}>
	<svg class="icon plus-icon" viewBox="0 0 24 24"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
	<input type="text" placeholder="Add a todo…" bind:value={title} />
	<input type="date" bind:value={date} />
	<button class="btn" type="submit" disabled={!listId}>Add</button>
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
		border: none;
		padding: 6px 0;
	}

	.input-row input[type='text']:focus-visible {
		box-shadow: none;
	}

	.input-row input[type='date'] {
		color: var(--fg-muted);
	}

	@media (max-width: 480px) {
		.input-row {
			flex-wrap: wrap;
		}

		.plus-icon {
			display: none;
		}

		.input-row input[type='text'] {
			flex-basis: 100%;
			order: 1;
		}

		.input-row input[type='date'] {
			flex: 1;
			min-width: 0;
			order: 2;
		}

		.input-row button {
			order: 3;
		}
	}
</style>
