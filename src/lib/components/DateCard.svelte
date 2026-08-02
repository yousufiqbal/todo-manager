<script lang="ts">
	import { toggleTodo, editTodoTitle, moveTodoDate, removeTodo, type Todo } from '$lib/stores/todos.svelte.js';
	import { autofocus } from '$lib/actions/focus.js';

	let { date, todos }: { date: string; todos: Todo[] } = $props();

	let editingId = $state<string | null>(null);
	let editingTitle = $state('');
	let openOptionsId = $state<string | null>(null);

	function formatDate(d: string) {
		const dt = new Date(`${d}T00:00:00`);
		const datePart = dt.toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' });
		const weekday = dt.toLocaleDateString(undefined, { weekday: 'long' });
		return `${datePart}, ${weekday}`;
	}

	function isToday(d: string) {
		return d === new Date().toISOString().slice(0, 10);
	}

	function startEdit(todo: Todo) {
		editingId = todo.id;
		editingTitle = todo.title;
	}

	function commitEdit() {
		if (editingId && editingTitle.trim()) {
			editTodoTitle(editingId, editingTitle.trim());
		}
		editingId = null;
	}

	function handleMoveDate(id: string, e: Event & { currentTarget: HTMLInputElement }) {
		const newDate = e.currentTarget.value;
		if (newDate) moveTodoDate(id, newDate);
		openOptionsId = null;
	}

	function toggleOptions(id: string) {
		openOptionsId = openOptionsId === id ? null : id;
	}

	function closeOptions(e: MouseEvent) {
		if (openOptionsId && !(e.target as HTMLElement).closest('.options')) {
			openOptionsId = null;
		}
	}
</script>

<svelte:window onclick={closeOptions} />

<section class="card date-card">
	<h3 class:today={isToday(date)}>
		<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="M8 2v4" /><path d="M16 2v4" /></svg>
		{formatDate(date)}
		{#if isToday(date)}<span class="today-badge">Today</span>{/if}
	</h3>
	<ul>
		{#each todos as todo (todo.id)}
			<li class:done={!!todo.done}>
				<label class="checkbox">
					<input
						type="checkbox"
						checked={!!todo.done}
						onchange={(e) => toggleTodo(todo.id, e.currentTarget.checked)}
					/>
					<span class="checkbox-box">
						<svg class="icon check-icon" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
					</span>
				</label>
				{#if editingId === todo.id}
					<input
						type="text"
						class="edit-input"
						bind:value={editingTitle}
						onblur={commitEdit}
						onkeydown={(e) => e.key === 'Enter' && commitEdit()}
						use:autofocus
					/>
				{:else}
					<button type="button" class="title" onclick={() => startEdit(todo)}>{todo.title}</button>
				{/if}

				<div class="options">
					<button class="btn-ghost" onclick={() => toggleOptions(todo.id)} aria-label="Todo options">
						<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="19" r="1.4" /></svg>
					</button>
					{#if openOptionsId === todo.id}
						<div class="popover card">
							<label class="move-label">
								Move to date
								<input type="date" value={todo.date} onchange={(e) => handleMoveDate(todo.id, e)} />
							</label>
							<button class="popover-delete" onclick={() => removeTodo(todo.id)}>
								<svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
								Delete todo
							</button>
						</div>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
</section>

<style>
	.date-card {
		padding: var(--space-4);
	}

	h3 {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: 0 0 var(--space-3);
		font-size: 15px;
		color: var(--fg);
		font-weight: 600;
	}

	h3 .icon {
		color: var(--fg-subtle);
	}

	h3.today .icon {
		color: var(--fg);
	}

	.today-badge {
		font-size: 11px;
		font-weight: 600;
		color: #fff;
		background: var(--fg);
		padding: 2px 8px;
		border-radius: 999px;
		letter-spacing: 0.02em;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 7px var(--space-2);
		border-radius: var(--radius-sm);
		position: relative;
		transition: background-color 150ms var(--ease);
	}

	li:hover {
		background: var(--bg-hover);
	}

	.checkbox {
		display: inline-flex;
		cursor: pointer;
		flex-shrink: 0;
	}

	.checkbox input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}

	.checkbox-box {
		width: 19px;
		height: 19px;
		border-radius: 50%;
		border: 1.5px solid var(--border-hover);
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-elevated);
		transition:
			background-color 150ms var(--ease),
			border-color 150ms var(--ease),
			transform 100ms var(--ease);
	}

	.checkbox:active .checkbox-box {
		transform: scale(0.9);
	}

	.check-icon {
		width: 11px;
		height: 11px;
		stroke: #fff;
		stroke-width: 3;
		opacity: 0;
		transform: scale(0.5);
		transition:
			opacity 120ms var(--ease),
			transform 120ms var(--ease);
	}

	.checkbox input:checked + .checkbox-box {
		background: var(--fg);
		border-color: var(--fg);
	}

	.checkbox input:checked + .checkbox-box .check-icon {
		opacity: 1;
		transform: scale(1);
	}

	.checkbox input:focus-visible + .checkbox-box {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.title {
		flex: 1;
		text-align: left;
		background: transparent;
		border: none;
		padding: 4px 0;
		color: inherit;
		font: inherit;
		cursor: text;
		transition: color 150ms var(--ease);
	}

	li.done .title {
		text-decoration: line-through;
		color: var(--fg-subtle);
	}

	.edit-input {
		flex: 1;
	}

	.options {
		position: relative;
	}

	.move-label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 12px;
		color: var(--fg-muted);
		padding: 4px 4px 0;
	}
</style>
