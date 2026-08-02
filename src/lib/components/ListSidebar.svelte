<script lang="ts">
	import { goto } from '$app/navigation';
	import { listsState, selectList, addList } from '$lib/stores/lists.svelte.js';
	import { autofocus } from '$lib/actions/focus.js';

	let { open = false, onClose }: { open?: boolean; onClose?: () => void } = $props();

	let showAddModal = $state(false);
	let newListName = $state('');

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
		<div class="logo-chip">
			<svg class="icon logo" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
		</div>
		<div class="brand-text">
			<span class="brand-title">Todo Manager</span>
			<span class="brand-subtitle">by Yousuf Iqbal</span>
		</div>
	</div>

	<div class="section-header">
		<h2>Lists</h2>
		<button class="btn-ghost" onclick={openAddModal} aria-label="Add list" title="Add list">
			<svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
		</button>
	</div>

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
		else if (open) onClose?.();
	}}
/>

{#if showAddModal}
	<div class="modal-backdrop" onclick={closeAddModal} role="presentation">
		<div class="modal card" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="dialog" aria-modal="true" aria-labelledby="add-title" tabindex="-1">
			<form onsubmit={submitAdd}>
				<h2 id="add-title">New list</h2>
				<p>Give your list a name.</p>
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

<style>
	.sidebar {
		width: 240px;
		flex-shrink: 0;
		background: var(--bg-elevated);
		border-right: 1px solid var(--border);
		padding: var(--space-5) var(--space-3);
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

	.logo-chip {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		flex-shrink: 0;
		border-radius: var(--radius);
		background: var(--fg);
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
		width: 18px;
		height: 18px;
		stroke-width: 2.4;
		color: #fff;
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

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow-y: auto;
		flex: 1;
	}

	li {
		display: flex;
		align-items: center;
		border-radius: var(--radius-sm);
		position: relative;
		transition: background-color 150ms var(--ease);
	}

	li:not(.empty):hover {
		background: var(--bg-hover);
	}

	li.active {
		background: var(--bg);
	}

	li.active::before {
		content: '';
		position: absolute;
		left: -1px;
		top: 20%;
		bottom: 20%;
		width: 2.5px;
		border-radius: 2px;
		background: var(--fg);
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
		color: var(--fg);
		background: var(--border);
	}

	li.active .list-btn {
		color: var(--fg);
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
