<script lang="ts">
	import { todosState, updateTodoNote } from '$lib/stores/todos.svelte.js';

	let selectedTodo = $derived(todosState.items.find((t) => t.id === todosState.selectedId));

	let noteValue = $state('');
	let lastLoadedId: string | null = null;

	$effect(() => {
		const todo = selectedTodo;
		if (todo && todo.id !== lastLoadedId) {
			noteValue = todo.note;
			lastLoadedId = todo.id;
		} else if (!todo) {
			lastLoadedId = null;
		}
	});

	function handleInput(e: Event & { currentTarget: HTMLTextAreaElement }) {
		noteValue = e.currentTarget.value;
	}

	function saveNote() {
		if (selectedTodo && noteValue !== selectedTodo.note) {
			updateTodoNote(selectedTodo.id, noteValue);
		}
	}
</script>

<aside class="notes-panel">
	{#if selectedTodo}
		{@const todo = selectedTodo}
		<div class="notes-header">
			<span class="notes-label">Note</span>
			<span class="notes-todo-title">{todo.title}</span>
		</div>
		<textarea
			class="notes-textarea"
			placeholder="Add a note…"
			value={noteValue}
			oninput={handleInput}
			onblur={saveNote}
		></textarea>
	{:else}
		<div class="notes-empty">
			<svg class="icon" viewBox="0 0 24 24"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" /><path d="M9 13h6" /><path d="M9 17h6" /></svg>
			<p>No todo selected</p>
			<span>Click a todo to add a note.</span>
		</div>
	{/if}
</aside>

<style>
	.notes-panel {
		flex: 1;
		min-width: 260px;
		padding: var(--space-6) var(--space-6) var(--space-6) 0;
		display: flex;
		flex-direction: column;
	}

	.notes-header {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-bottom: var(--space-3);
	}

	.notes-label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--fg-subtle);
		font-weight: 600;
	}

	.notes-todo-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--fg);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.notes-textarea {
		flex: 1;
		width: 100%;
		min-height: 200px;
		resize: none;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: var(--space-3);
		font: inherit;
		color: var(--fg);
		line-height: 1.6;
		outline: none;
		transition: border-color 150ms var(--ease);
	}

	.notes-textarea:focus-visible {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.08);
	}

	.notes-empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		text-align: center;
		color: var(--fg-subtle);
	}

	.notes-empty .icon {
		width: 28px;
		height: 28px;
		margin-bottom: var(--space-2);
		stroke-width: 1.4;
	}

	.notes-empty p {
		margin: 0;
		font-size: 14px;
		font-weight: 500;
		color: var(--fg-muted);
	}

	.notes-empty span {
		font-size: 13px;
	}

	@media (max-width: 900px) {
		.notes-panel {
			display: none;
		}
	}
</style>
