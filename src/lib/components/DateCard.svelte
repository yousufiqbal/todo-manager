<script lang="ts">
	import {
		toggleTodo,
		editTodoTitle,
		moveTodoDate,
		removeTodo,
		reorderTodos,
		type Todo
	} from '$lib/stores/todos.svelte.js';
	import { autofocus } from '$lib/actions/focus.js';
	import { autosize } from '$lib/actions/autosize.js';
	import { todayLocalStr } from '$lib/date.js';

	// `heading` overrides the date title — the Today view groups by list instead,
	// where every card is the same date and the list name is the useful label.
	let { date, todos, heading }: { date: string; todos: Todo[]; heading?: string } = $props();

	// Pending before done. Array.prototype.sort is stable, so todos keep their
	// existing created_at ordering within each group.
	let sortedTodos = $derived([...todos].sort((a, b) => Number(a.done) - Number(b.done)));

	function openDatePicker(node: HTMLInputElement) {
		node.focus();
		try {
			node.showPicker?.();
		} catch {
			// showPicker requires transient user activation; if the browser
			// rejects it here, the input is still focused and usable directly.
		}
	}

	let editingId = $state<string | null>(null);
	let editingTitle = $state('');
	let openOptionsId = $state<string | null>(null);
	let shiftingId = $state<string | null>(null);

	function formatDate(d: string) {
		const dt = new Date(`${d}T00:00:00`);
		const day = String(dt.getDate()).padStart(2, '0');
		const month = dt.toLocaleDateString('en-US', { month: 'long' });
		const weekday = dt.toLocaleDateString('en-US', { weekday: 'long' });
		return `${day} ${month} ${dt.getFullYear()}, ${weekday}`;
	}

	function isToday(d: string) {
		return d === todayLocalStr();
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

	function cancelEdit() {
		editingId = null;
		editingTitle = '';
	}

	function toggleOptions(id: string) {
		openOptionsId = openOptionsId === id ? null : id;
		shiftingId = null;
	}

	function startShift(id: string) {
		shiftingId = id;
	}

	function commitShift(id: string, newDate: string) {
		if (newDate) {
			moveTodoDate(id, newDate);
		}
		shiftingId = null;
		openOptionsId = null;
	}

	let dragId = $state<string | null>(null);
	// Insertion point as an index into the *displayed* order: the todo lands
	// immediately before sortedTodos[dropIndex] (== length means "at the end").
	let dropIndex = $state<number | null>(null);
	let dropLineY = $state(0);
	let listEl = $state<HTMLUListElement | undefined>();

	function handleDragStart(e: DragEvent, id: string) {
		dragId = id;
		e.dataTransfer?.setData('text/plain', id);
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	/**
	 * dragover lives on the <ul>, not each row: the indicator is an absolutely
	 * positioned overlay, so it never reflows the rows out from under the cursor
	 * (which would retrigger dragover on a different row and thrash the target).
	 */
	function handleDragOver(e: DragEvent) {
		if (!dragId || !listEl) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

		const rows = [...listEl.querySelectorAll<HTMLElement>('li[data-id]')];
		if (rows.length === 0) return;

		const listTop = listEl.getBoundingClientRect().top;

		// Insert before the first row whose midpoint sits below the cursor.
		let index = rows.length;
		for (let i = 0; i < rows.length; i++) {
			const rect = rows[i].getBoundingClientRect();
			if (e.clientY < rect.top + rect.height / 2) {
				index = i;
				break;
			}
		}

		dropIndex = index;
		dropLineY =
			index < rows.length
				? rows[index].getBoundingClientRect().top - listTop - 1
				: rows[rows.length - 1].getBoundingClientRect().bottom - listTop - 1;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		if (!dragId || dropIndex === null) return resetDrag();

		// Split the displayed order at the insertion point, drop the dragged id out
		// of both halves, then rejoin around it — correct whether it moved up or down.
		const ordered = sortedTodos.map((t) => t.id);
		const before = ordered.slice(0, dropIndex).filter((id) => id !== dragId);
		const after = ordered.slice(dropIndex).filter((id) => id !== dragId);
		const next = [...before, dragId, ...after];

		if (next.some((id, i) => id !== ordered[i])) reorderTodos(next);
		resetDrag();
	}

	function resetDrag() {
		dragId = null;
		dropIndex = null;
	}

	// Capture phase: by the time a click bubbles back up here, a handler inside the
	// popover may already have swapped its own element out of the DOM, and a
	// detached target reports no `.options` ancestor.
	function closeOptions(e: MouseEvent) {
		if (openOptionsId && !(e.target as HTMLElement).closest('.options')) {
			openOptionsId = null;
			shiftingId = null;
		}
	}
</script>

<svelte:window onclickcapture={closeOptions} />

<section class="card date-card">
	<h3 class:today={!heading && isToday(date)}>
		{heading ?? formatDate(date)}
		{#if !heading && isToday(date)}<span class="today-badge">Today</span>{/if}
	</h3>
	<ul
		bind:this={listEl}
		ondragover={handleDragOver}
		ondrop={handleDrop}
		ondragend={resetDrag}
		ondragleave={(e) => {
			if (!e.relatedTarget || !listEl?.contains(e.relatedTarget as Node)) dropIndex = null;
		}}
	>
		{#if dragId && dropIndex !== null}
			<div class="drop-line" style="top: {dropLineY}px" aria-hidden="true"></div>
		{/if}
		{#each sortedTodos as todo (todo.id)}
			<li
				data-id={todo.id}
				draggable={editingId !== todo.id}
				class:done={!!todo.done}
				class:dragging={dragId === todo.id}
				ondragstart={(e) => handleDragStart(e, todo.id)}
			>
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
					<textarea
						class="edit-input"
						rows="1"
						bind:value={editingTitle}
						onblur={commitEdit}
						onkeydown={(e) => {
							// Enter commits (matching the add-todo input); Shift+Enter
							// inserts a newline for multi-line todos.
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								commitEdit();
							} else if (e.key === 'Escape') {
								e.preventDefault();
								cancelEdit();
							}
						}}
						use:autofocus
						use:autosize
					></textarea>
				{:else}
					<button type="button" class="title" ondblclick={() => startEdit(todo)}>{todo.title}</button>
				{/if}

				<div class="options">
					<button class="btn-ghost" onclick={() => toggleOptions(todo.id)} aria-label="Todo options">
						<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="19" r="1.4" /></svg>
					</button>
					{#if openOptionsId === todo.id}
						<div class="popover card">
							{#if shiftingId === todo.id}
								<label class="popover-date">
									<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="M8 2v4" /><path d="M16 2v4" /></svg>
									<input
										type="date"
										value={todo.date}
										use:openDatePicker
										onchange={(e) => commitShift(todo.id, e.currentTarget.value)}
										onclick={(e) => e.currentTarget.showPicker?.()}
									/>
								</label>
							{:else}
								<button class="popover-item" onclick={() => startShift(todo.id)}>
									<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="M8 2v4" /><path d="M16 2v4" /></svg>
									Shift To
								</button>
							{/if}
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
		padding: var(--space-3);
	}

	h3 {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: 0 calc(-1 * var(--space-3)) var(--space-2);
		padding: 0 var(--space-3) var(--space-2);
		border-bottom: 1px solid var(--border);
		font-size: 14px;
		color: var(--fg);
		font-weight: 600;
	}

	h3.today {
		color: var(--warning);
	}

	.today-badge {
		margin-left: auto;
		font-size: 11px;
		font-weight: 600;
		color: var(--warning);
		background: var(--warning-bg);
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
		position: relative;
	}

	/* Absolute overlay so showing the indicator never reflows the rows underneath
	   the cursor (which would retrigger dragover and thrash the drop target). */
	.drop-line {
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		border-radius: 1px;
		background: var(--fg);
		pointer-events: none;
		z-index: 1;
	}

	li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 4px var(--space-2);
		border-radius: var(--radius-sm);
		position: relative;
		transition: background-color 150ms var(--ease);
	}

	li:hover {
		background: var(--bg-hover);
	}

	li.dragging {
		opacity: 0.4;
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
		background: var(--fg-solid);
		border-color: var(--fg-solid);
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
		min-width: 0;
		text-align: left;
		background: transparent;
		border: none;
		padding: 2px 0;
		color: inherit;
		font: inherit;
		cursor: grab;
		/* Buttons collapse whitespace by default, which would flatten a
		   multi-line todo onto one line. */
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		transition: color 150ms var(--ease);
	}

	li.done .title {
		text-decoration: line-through;
		color: var(--fg-subtle);
	}

	/* Mirrors the global input styling — app.css only targets input[type=...],
	   so a textarea gets none of it. */
	.edit-input {
		flex: 1;
		min-width: 0;
		font: inherit;
		color: var(--fg);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 6px 10px;
		outline: none;
		/* Height is driven by the autosize action; both of these keep the browser
		   from adding its own scrollbar or drag handle. */
		resize: none;
		overflow: hidden;
		transition:
			border-color 150ms var(--ease),
			box-shadow 150ms var(--ease);
	}

	.edit-input:focus-visible {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.08);
	}

	.options {
		position: relative;
	}

</style>
