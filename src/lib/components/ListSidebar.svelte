<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, scale } from 'svelte/transition';
	import { listsState, selectList, addList, removeList, reorderLists } from '$lib/stores/lists.svelte.js';
	import { autofocus } from '$lib/actions/focus.js';

	let { open = false, onClose }: { open?: boolean; onClose?: () => void } = $props();

	let showAddModal = $state(false);
	let newListName = $state('');
	let showSortModal = $state(false);

	let listsLoadingVisible = $state(false);
	$effect(() => {
		if (listsState.loaded) {
			listsLoadingVisible = false;
			return;
		}
		const t = setTimeout(() => (listsLoadingVisible = true), 200);
		return () => clearTimeout(t);
	});

	function handleSelect(id: string) {
		selectList(id);
		onClose?.();
	}

	function openAddModal() {
		newListName = '';
		showAddModal = true;
	}

	function closeAddModal() {
		showAddModal = false;
		newListName = '';
	}

	function submitAdd(e: SubmitEvent) {
		e.preventDefault();
		if (!newListName.trim()) return;
		addList(newListName.trim());
		closeAddModal();
	}

	let dragId = $state<string | null>(null);
	// Insertion point as an index into the *currently displayed* array: the item
	// lands immediately before items[dropIndex] (== items.length means "at end").
	let dropIndex = $state<number | null>(null);
	// Y offset of the indicator within the list's scrollable content box.
	let dropLineY = $state(0);
	let sortListEl = $state<HTMLUListElement | undefined>();

	function handleDragStart(e: DragEvent, id: string) {
		dragId = id;
		e.dataTransfer?.setData('text/plain', id);
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	/**
	 * dragover lives on the <ul>, not each row: the indicator is an absolutely
	 * positioned overlay, so it never reflows the rows out from under the cursor
	 * (which would retrigger dragover on a different row and thrash the target).
	 * Handling it here also means every pixel of the list is a valid drop zone.
	 */
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (!dragId || !sortListEl) return;
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

		const rows = [...sortListEl.querySelectorAll<HTMLElement>('li[data-id]')];
		if (rows.length === 0) return;

		const listRect = sortListEl.getBoundingClientRect();
		const toContentY = (clientY: number) => clientY - listRect.top + sortListEl!.scrollTop;

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
				? toContentY(rows[index].getBoundingClientRect().top) - 1
				: toContentY(rows[rows.length - 1].getBoundingClientRect().bottom) - 1;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		if (!dragId || dropIndex === null) return resetDrag();

		// Split the displayed order at the insertion point, drop the dragged id out
		// of both halves, then rejoin around it — correct whether it moved up or down.
		const ordered = listsState.items.map((l) => l.id);
		const before = ordered.slice(0, dropIndex).filter((id) => id !== dragId);
		const after = ordered.slice(dropIndex).filter((id) => id !== dragId);
		const next = [...before, dragId, ...after];

		if (next.some((id, i) => id !== ordered[i])) reorderLists(next);
		resetDrag();
	}

	function resetDrag() {
		dragId = null;
		dropIndex = null;
	}

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		await goto('/login');
	}
</script>

{#if open}
	<div class="sidebar-backdrop" onclick={onClose} role="presentation"></div>
{/if}

<aside class="sidebar" class:open>
	<div class="section-header">
		<h2>Lists</h2>
		<div class="section-header-actions">
			<button class="btn-ghost" onclick={() => (showSortModal = true)} aria-label="Sort lists" title="Sort lists">
				<svg class="icon" viewBox="0 0 24 24"><path d="M11 5h10" /><path d="M11 9h7" /><path d="M11 13h4" /><path d="M3 17l3 3 3-3" /><path d="M6 18V4" /></svg>
			</button>
			<button class="btn-ghost" onclick={openAddModal} aria-label="Add list" title="Add list">
				<svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
			</button>
		</div>
	</div>

	<div class="list-area">
		{#if !listsState.loaded}
			{#if listsLoadingVisible}
				<div class="sidebar-loading">
					<div class="spinner"></div>
				</div>
			{/if}
		{:else}
			<ul>
				{#each listsState.items as list (list.id)}
					<li class:active={list.id === listsState.selectedId}>
						<button class="list-btn" onclick={() => handleSelect(list.id)}>
							<span class="list-name">{list.name}</span>
							{#if list.pending_count > 0}
								<span class="count-pill">{list.pending_count}</span>
							{/if}
						</button>
					</li>
				{:else}
					<li class="empty">No lists yet</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="footer">
		<div class="brand">
			<svg class="icon logo" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
			<div class="brand-text">
				<span class="brand-title">Todo Manager</span>
				<span class="brand-subtitle">by Yousuf Iqbal</span>
			</div>
			<button class="btn-ghost logout" onclick={handleLogout} aria-label="Log out" title="Log out">
				<svg class="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
			</button>
		</div>
	</div>
</aside>

<svelte:window
	onkeydown={(e) => {
		if (e.key !== 'Escape') return;
		if (showAddModal) closeAddModal();
		else if (showSortModal) showSortModal = false;
		else if (open) onClose?.();
	}}
/>

{#if showAddModal}
	<div class="modal-backdrop" onclick={closeAddModal} role="presentation" transition:fade={{ duration: 150 }}>
		<div class="modal card" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="dialog" aria-modal="true" aria-labelledby="add-title" tabindex="-1" transition:scale={{ duration: 180, start: 0.96 }}>
			<form onsubmit={submitAdd}>
				<h2 id="add-title">New list</h2>
				<label class="field-label">
					List name
					<input type="text" bind:value={newListName} placeholder="e.g. Work" autocomplete="off" use:autofocus />
				</label>
				<div class="modal-actions">
					<button type="button" class="btn-secondary" onclick={closeAddModal}>Cancel</button>
					<button type="submit" class="btn" disabled={!newListName.trim()}>Create list</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if showSortModal}
	<div class="modal-backdrop" onclick={() => (showSortModal = false)} role="presentation" transition:fade={{ duration: 150 }}>
		<div class="modal card" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="dialog" aria-modal="true" aria-labelledby="sort-title" tabindex="-1" transition:scale={{ duration: 180, start: 0.96 }}>
			<h2 id="sort-title">Sort lists</h2>
			<ul
				class="sort-list"
				bind:this={sortListEl}
				ondragover={handleDragOver}
				ondrop={handleDrop}
				ondragend={resetDrag}
				ondragleave={(e) => {
					if (!e.relatedTarget || !sortListEl?.contains(e.relatedTarget as Node)) dropIndex = null;
				}}
			>
				{#if dragId && dropIndex !== null}
					<div class="drop-line" style="top: {dropLineY}px" aria-hidden="true"></div>
				{/if}
				{#each listsState.items as list (list.id)}
					<li
						data-id={list.id}
						draggable="true"
						class:dragging={dragId === list.id}
						ondragstart={(e) => handleDragStart(e, list.id)}
					>
						<svg class="icon drag-handle" viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.2" /><circle cx="9" cy="12" r="1.2" /><circle cx="9" cy="18" r="1.2" /><circle cx="15" cy="6" r="1.2" /><circle cx="15" cy="12" r="1.2" /><circle cx="15" cy="18" r="1.2" /></svg>
						<span class="sort-list-name">{list.name}</span>
					</li>
				{/each}
			</ul>
			<div class="modal-actions">
				<button type="button" class="btn" onclick={() => (showSortModal = false)}>Done</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.sidebar {
		width: 240px;
		flex-shrink: 0;
		background: var(--bg-elevated);
		border-right: 1px solid var(--border);
		padding: var(--space-5) var(--space-3) var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		height: 100vh;
		position: sticky;
		top: 0;
		/* Flex children stretch by default, which would make the sidebar as tall as
		   the scrolling content and leave nothing for sticky to pin against. */
		align-self: flex-start;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-top: var(--space-3);
		padding: var(--space-3) var(--space-3) 0;
		border-top: 1px solid var(--border);
	}

	.brand-text {
		display: flex;
		flex-direction: column;
		line-height: 1.3;
		flex: 1;
		min-width: 0;
	}

	.brand-title {
		font-weight: 600;
		font-size: 15px;
	}

	.brand-subtitle {
		font-weight: 400;
		font-size: 11px;
		color: var(--fg-subtle);
	}

	.logo {
		width: 36px;
		height: 36px;
		flex-shrink: 0;
		stroke-width: 2.2;
		color: var(--fg);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--space-1) 0 var(--space-2);
	}

	.section-header h2 {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--fg-subtle);
		margin: 0;
	}

	.section-header-actions {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.sort-list {
		list-style: none;
		margin: 0 0 var(--space-4);
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 320px;
		overflow-y: auto;
		position: relative;
	}

	.sort-list li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 6px var(--space-2);
		border-radius: var(--radius-sm);
		background: var(--bg-hover);
		cursor: grab;
		position: relative;
		box-shadow: none;
		transition: opacity 150ms var(--ease);
	}

	.sort-list li.dragging {
		opacity: 0.4;
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

	.drag-handle {
		flex-shrink: 0;
		color: var(--fg-subtle);
	}

	.sort-list-name {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 13px;
		font-weight: 500;
	}

	.list-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow-y: auto;
	}

	li {
		display: flex;
		align-items: center;
		border-radius: var(--radius-sm);
		position: relative;
		transition: background-color 150ms var(--ease);
	}

	li:not(.empty):not(.active):hover {
		background: var(--bg-hover);
	}

	li.active {
		background: var(--fg-solid);
		box-shadow: var(--shadow-sm);
	}

	li.empty {
		color: var(--fg-subtle);
		font-size: 13px;
		padding: var(--space-2);
	}

	.list-btn {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		text-align: left;
		background: transparent;
		border: none;
		padding: 8px 10px;
		border-radius: var(--radius-sm);
		color: var(--fg-muted);
		font-weight: 500;
		transition: color 150ms var(--ease);
		min-width: 0;
	}

	.list-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.count-pill {
		margin-left: auto;
	}

	li.active .count-pill {
		color: #fff;
		background: rgba(255, 255, 255, 0.18);
	}

	li.active .list-btn {
		color: #fff;
		font-weight: 600;
	}

	.list-btn:hover {
		color: var(--fg);
	}

	.footer {
		margin: 0 calc(-1 * var(--space-3));
	}

	.logout {
		flex-shrink: 0;
	}

	.sidebar-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
	}

	.sidebar-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		z-index: 150;
		animation: fade-in 150ms var(--ease);
	}

	@media (max-width: 768px) {
		.sidebar {
			position: fixed;
			inset: 0 auto 0 0;
			z-index: 200;
			transform: translateX(-100%);
			transition: transform 200ms var(--ease);
			box-shadow: var(--shadow-md);
		}

		.sidebar.open {
			transform: translateX(0);
		}
	}
</style>
