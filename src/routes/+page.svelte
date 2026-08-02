<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { listsState, loadLists, renameList, removeList } from '$lib/stores/lists.svelte.js';
	import { todosState, loadTodos, undoState, undoRemoveTodo, type Todo } from '$lib/stores/todos.svelte.js';
	import { autofocus } from '$lib/actions/focus.js';
	import ListSidebar from '$lib/components/ListSidebar.svelte';
	import TodoInput from '$lib/components/TodoInput.svelte';
	import DateCard from '$lib/components/DateCard.svelte';

	onMount(async () => {
		await loadLists();
		const urlListId = page.url.searchParams.get('list');
		if (urlListId && listsState.items.some((l) => l.id === urlListId)) {
			listsState.selectedId = urlListId;
		}
	});

	$effect(() => {
		loadTodos(listsState.selectedId);
	});

	$effect(() => {
		const id = listsState.selectedId;
		if (!id || page.url.searchParams.get('list') === id) return;
		const url = new URL(page.url);
		url.searchParams.set('list', id);
		goto(`${url.pathname}${url.search}`, { replaceState: true, keepFocus: true, noScroll: true });
	});

	let grouped = $derived.by(() => {
		const map = new Map<string, Todo[]>();
		for (const todo of todosState.items) {
			if (!map.has(todo.date)) map.set(todo.date, []);
			map.get(todo.date)!.push(todo);
		}
		return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
	});

	let selectedList = $derived(listsState.items.find((l) => l.id === listsState.selectedId));

	const LOADING_DELAY_MS = 200;

	let listsLoadingVisible = $state(false);
	$effect(() => {
		if (listsState.loaded) {
			listsLoadingVisible = false;
			return;
		}
		const t = setTimeout(() => (listsLoadingVisible = true), LOADING_DELAY_MS);
		return () => clearTimeout(t);
	});

	let todosLoadingVisible = $state(false);
	$effect(() => {
		if (!selectedList || todosState.loadedForListId === selectedList.id) {
			todosLoadingVisible = false;
			return;
		}
		const t = setTimeout(() => (todosLoadingVisible = true), LOADING_DELAY_MS);
		return () => clearTimeout(t);
	});

	let sidebarOpen = $state(false);

	let showOptions = $state(false);
	let showRenameModal = $state(false);
	let renameValue = $state('');
	let showDeleteModal = $state(false);
	let deleteConfirmText = $state('');
	let deleteConfirmValid = $derived(deleteConfirmText.trim().toLowerCase() === 'delete');

	function toggleOptions() {
		showOptions = !showOptions;
	}

	function closeOptions(e: MouseEvent) {
		if (showOptions && !(e.target as HTMLElement).closest('.list-options')) {
			showOptions = false;
		}
	}

	function openRenameModal() {
		if (!selectedList) return;
		renameValue = selectedList.name;
		showRenameModal = true;
		showOptions = false;
	}

	function closeRenameModal() {
		showRenameModal = false;
		renameValue = '';
	}

	function submitRename(e: SubmitEvent) {
		e.preventDefault();
		if (!selectedList || !renameValue.trim()) return;
		renameList(selectedList.id, renameValue.trim());
		closeRenameModal();
	}

	function openDeleteModal() {
		showDeleteModal = true;
		deleteConfirmText = '';
		showOptions = false;
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		deleteConfirmText = '';
	}

	function confirmDeleteList() {
		if (!selectedList || !deleteConfirmValid) return;
		removeList(selectedList.id);
		closeDeleteModal();
	}
</script>

<svelte:window
	onclick={closeOptions}
	onkeydown={(e) => {
		if (e.key !== 'Escape') return;
		if (showRenameModal) closeRenameModal();
		else if (showDeleteModal) closeDeleteModal();
		else if (showOptions) showOptions = false;
	}}
/>

<div class="layout">
	<ListSidebar open={sidebarOpen} onClose={() => (sidebarOpen = false)} />

	<main>
		<header>
			<div class="title-row">
				<h1>{selectedList ? selectedList.name : 'Select a list'}</h1>
				{#if selectedList && selectedList.pending_count > 0}
					<span class="count-pill">{selectedList.pending_count}</span>
				{/if}
			</div>
			<div class="header-actions">
				{#if selectedList}
					<div class="list-options">
						<button class="btn-ghost" onclick={toggleOptions} aria-label="List options" title="List options">
							<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="19" r="1.4" /></svg>
						</button>
						{#if showOptions}
							<div class="popover card">
								<button class="popover-item" onclick={openRenameModal}>
									<svg class="icon" viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
									Rename list
								</button>
								<button class="popover-delete" onclick={openDeleteModal}>
									<svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
									Delete list
								</button>
							</div>
						{/if}
					</div>
				{/if}
				<button class="btn-ghost hamburger" onclick={() => (sidebarOpen = true)} aria-label="Open menu" title="Open menu">
					<svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></svg>
				</button>
			</div>
		</header>

		{#if !listsState.loaded}
			{#if listsLoadingVisible}
				<div class="loading-state">
					<div class="spinner"></div>
				</div>
			{/if}
		{:else if listsState.items.length === 0}
			<div class="empty-state">
				<svg class="icon" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
				<p>No lists yet</p>
				<span>Create a list on the left to start adding todos.</span>
			</div>
		{:else if selectedList}
			<TodoInput listId={selectedList.id} />

			{#if todosState.loadedForListId !== selectedList.id}
				{#if todosLoadingVisible}
					<div class="loading-state">
						<div class="spinner"></div>
					</div>
				{/if}
			{:else}
				{#key selectedList.id}
					<div class="cards">
						{#each grouped as [date, todos], i (date)}
							<div in:fly|global={{ y: 10, duration: 250, delay: i * 40 }}>
								<DateCard {date} {todos} />
							</div>
						{/each}
						{#if grouped.length === 0}
							<div class="empty-state">
								<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="M8 2v4" /><path d="M16 2v4" /></svg>
								<p>No todos yet</p>
								<span>Add one above to get started.</span>
							</div>
						{/if}
					</div>
				{/key}
			{/if}
		{/if}
	</main>
</div>

{#if undoState.todo}
	{#key undoState.todo.id}
		<div class="toast">
			<span class="toast-msg">Todo deleted</span>
			<button class="toast-undo" onclick={undoRemoveTodo}>Undo</button>
			<div class="toast-bar"></div>
		</div>
	{/key}
{/if}

{#if showRenameModal && selectedList}
	<div class="modal-backdrop" onclick={closeRenameModal} role="presentation">
		<div class="modal card" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="dialog" aria-modal="true" aria-labelledby="rename-title" tabindex="-1">
			<form onsubmit={submitRename}>
				<h2 id="rename-title">Rename list</h2>
				<p>Choose a new name for this list.</p>
				<label class="field-label">
					List name
					<input type="text" bind:value={renameValue} autocomplete="off" use:autofocus />
				</label>
				<div class="modal-actions">
					<button type="button" class="btn-secondary" onclick={closeRenameModal}>Cancel</button>
					<button type="submit" class="btn" disabled={!renameValue.trim()}>Save</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if showDeleteModal && selectedList}
	<div class="modal-backdrop" onclick={closeDeleteModal} role="presentation">
		<div class="modal card" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="dialog" aria-modal="true" aria-labelledby="delete-title" tabindex="-1">
			<div class="modal-icon">
				<svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
			</div>
			<h2 id="delete-title">Delete "{selectedList.name}"?</h2>
			<p>This permanently deletes the list and all its todos. This can't be undone.</p>
			<label class="field-label">
				<span>Type <strong>delete</strong> to confirm</span>
				<input
					type="text"
					bind:value={deleteConfirmText}
					onkeydown={(e) => e.key === 'Enter' && deleteConfirmValid && confirmDeleteList()}
					autocomplete="off"
					use:autofocus
				/>
			</label>
			<div class="modal-actions">
				<button class="btn-secondary" onclick={closeDeleteModal}>Cancel</button>
				<button class="btn-danger" onclick={confirmDeleteList} disabled={!deleteConfirmValid}>Delete list</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.layout {
		display: flex;
	}

	main {
		flex: 1;
		padding: var(--space-6) var(--space-6);
		max-width: 720px;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-1);
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	h1 {
		font-size: 20px;
		font-weight: 600;
		margin: 0;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.list-options {
		position: relative;
	}

	.hamburger {
		display: none;
	}

	@media (max-width: 768px) {
		main {
			padding: var(--space-4);
			max-width: 100%;
		}

		.hamburger {
			display: inline-flex;
		}
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-6) var(--space-4);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: var(--space-6) var(--space-4);
		text-align: center;
		color: var(--fg-subtle);
	}

	.empty-state .icon {
		width: 28px;
		height: 28px;
		margin-bottom: var(--space-2);
		color: var(--fg-subtle);
		stroke-width: 1.4;
	}

	.empty-state p {
		margin: 0;
		font-size: 14px;
		font-weight: 500;
		color: var(--fg-muted);
	}

	.empty-state span {
		font-size: 13px;
	}

	.toast {
		position: fixed;
		left: 50%;
		bottom: var(--space-5);
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: var(--space-3);
		background: var(--fg);
		color: #fff;
		padding: 12px var(--space-2) 12px var(--space-4);
		border-radius: var(--radius);
		box-shadow: var(--shadow-md);
		overflow: hidden;
		animation: toast-in 200ms var(--ease);
		z-index: 100;
	}

	.toast-msg {
		font-size: 13px;
	}

	.toast-undo {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
		border: none;
		border-radius: var(--radius-sm);
		padding: 6px 12px;
		font-size: 13px;
		font-weight: 500;
		transition: background-color 150ms var(--ease);
	}

	.toast-undo:hover {
		background: rgba(255, 255, 255, 0.22);
	}

	.toast-bar {
		position: absolute;
		left: 0;
		bottom: 0;
		height: 2px;
		width: 100%;
		background: rgba(255, 255, 255, 0.35);
		transform-origin: left;
		animation: toast-countdown 5s linear forwards;
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	@keyframes toast-countdown {
		from {
			transform: scaleX(1);
		}
		to {
			transform: scaleX(0);
		}
	}
</style>
