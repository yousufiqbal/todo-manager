<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, scale } from 'svelte/transition';
	import { listsState, selectList, addList, addSeparator, removeList, reorderLists } from '$lib/stores/lists.svelte.js';
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

	let dragIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let dragOverPosition = $state<'before' | 'after' | null>(null);

	function handleDragStart(e: DragEvent, index: number) {
		dragIndex = index;
		e.dataTransfer?.setData('text/plain', String(index));
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		dragOverIndex = index;
		dragOverPosition = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
	}

	function handleDrop(e: DragEvent, index: number) {
		e.preventDefault();
		if (dragIndex === null) return;

		const ids = listsState.items.map((l) => l.id);
		const [moved] = ids.splice(dragIndex, 1);
		let insertAt = index > dragIndex ? index - 1 : index;
		if (dragOverPosition === 'after') insertAt += 1;
		ids.splice(insertAt, 0, moved);
		reorderLists(ids);

		dragIndex = null;
		dragOverIndex = null;
		dragOverPosition = null;
	}

	function handleDragEnd() {
		dragIndex = null;
		dragOverIndex = null;
		dragOverPosition = null;
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
	<div class="brand">
		<svg class="icon logo" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
		<div class="brand-text">
			<span class="brand-title">Todo Manager</span>
			<span class="brand-subtitle">by Yousuf Iqbal</span>
		</div>
	</div>

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
					{#if list.is_separator}
						<li class="separator" aria-hidden="true"><hr /></li>
					{:else}
						<li class:active={list.id === listsState.selectedId}>
							<button class="list-btn" onclick={() => handleSelect(list.id)}>
								<span class="list-name">{list.name}</span>
								{#if list.pending_count > 0}
									<span class="count-pill">{list.pending_count}</span>
								{/if}
							</button>
						</li>
					{/if}
				{:else}
					<li class="empty">No lists yet</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="footer">
		<button class="logout" onclick={handleLogout}>
			<svg class="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
			Log out
		</button>
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
			<ul class="sort-list">
				{#each listsState.items as list, i (list.id)}
					<li
						draggable="true"
						class:dragging={dragIndex === i}
						class:drop-before={dragOverIndex === i && dragOverPosition === 'before' && dragIndex !== i}
						class:drop-after={dragOverIndex === i && dragOverPosition === 'after' && dragIndex !== i}
						ondragstart={(e) => handleDragStart(e, i)}
						ondragover={(e) => handleDragOver(e, i)}
						ondrop={(e) => handleDrop(e, i)}
						ondragend={handleDragEnd}
					>
						<svg class="icon drag-handle" viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.2" /><circle cx="9" cy="12" r="1.2" /><circle cx="9" cy="18" r="1.2" /><circle cx="15" cy="6" r="1.2" /><circle cx="15" cy="12" r="1.2" /><circle cx="15" cy="18" r="1.2" /></svg>
						{#if list.is_separator}
							<hr class="sort-separator-line" />
						{:else}
							<span class="sort-list-name">{list.name}</span>
						{/if}
						{#if list.is_separator}
							<button class="btn-ghost sort-remove" onclick={() => removeList(list.id)} aria-label="Remove separator">
								<svg class="icon" viewBox="0 0 24 24"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
							</button>
						{/if}
					</li>
				{/each}
			</ul>
			<button type="button" class="add-separator-btn" onclick={addSeparator}>
				<svg class="icon" viewBox="0 0 24 24"><path d="M5 12h14" /></svg>
				Add separator
			</button>
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
	}

	.brand {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin: 0 calc(-1 * var(--space-3));
		padding: 0 var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	.brand-text {
		display: flex;
		flex-direction: column;
		line-height: 1.3;
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

	.sort-list li.drop-before {
		box-shadow: 0 -2px 0 0 var(--fg);
	}

	.sort-list li.drop-after {
		box-shadow: 0 2px 0 0 var(--fg);
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

	.sort-separator-line {
		flex: 1;
		border: none;
		border-top: 1px dashed var(--border-hover);
		margin: 0;
	}

	.sort-remove {
		flex-shrink: 0;
		opacity: 0;
	}

	.sort-list li:hover .sort-remove {
		opacity: 1;
	}

	.sort-remove:hover {
		color: var(--danger);
		background: var(--danger-bg);
	}

	.add-separator-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		width: 100%;
		background: transparent;
		border: 1px dashed var(--border-hover);
		border-radius: var(--radius-sm);
		padding: 8px;
		color: var(--fg-muted);
		font-size: 13px;
		font-weight: 500;
		margin-bottom: var(--space-4);
		transition:
			background-color 150ms var(--ease),
			color 150ms var(--ease);
	}

	.add-separator-btn:hover {
		color: var(--fg);
		background: var(--bg-hover);
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

	li:not(.empty):not(.active):not(.separator):hover {
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

	li.separator {
		padding: var(--space-2) var(--space-2);
	}

	li.separator hr {
		flex: 1;
		border: none;
		border-top: 1px solid var(--border-hover);
		margin: 0;
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
		color: #fcd34d;
		background: rgba(252, 211, 77, 0.18);
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
		padding: var(--space-3) var(--space-3) 0;
		border-top: 1px solid var(--border);
	}

	.logout {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		padding: 8px var(--space-2);
		color: var(--fg-muted);
		font-size: 13px;
		font-weight: 500;
		transition:
			background-color 150ms var(--ease),
			color 150ms var(--ease);
	}

	.logout:hover {
		color: var(--fg);
		background: var(--bg-hover);
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

	@media (min-width: 769px) {
		.sidebar {
			border: 1px solid var(--border);
			border-radius: var(--radius);
			box-shadow: var(--shadow-sm);
			height: calc(100vh - var(--space-6) * 2);
			position: sticky;
			top: var(--space-6);
		}
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
