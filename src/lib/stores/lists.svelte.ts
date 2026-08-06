export interface List {
	id: string;
	name: string;
	description: string;
	created_at: number;
	sort_order: number;
	pending_count: number;
}

/**
 * A list row whose name is exactly this is rendered as a divider rather than a
 * selectable list. Using a sentinel name keeps separators entirely inside the
 * existing `lists` table — no extra column, endpoint, or migration — so the
 * create, drag-reorder and delete paths work on them unchanged.
 */
export const SEPARATOR_NAME = '---';

export function isSeparator(list: List) {
	return list.name === SEPARATOR_NAME;
}

export const listsState = $state<{ items: List[]; selectedId: string | null; loaded: boolean }>({
	items: [],
	selectedId: null,
	loaded: false
});

/** Separators can never be the selected list, so fall back past them. */
function firstSelectableId() {
	return listsState.items.find((l) => !isSeparator(l))?.id ?? null;
}

export async function loadLists() {
	const res = await fetch('/api/lists');
	if (res.ok) {
		listsState.items = await res.json();
		if (!listsState.selectedId) {
			listsState.selectedId = firstSelectableId();
		}
	}
	listsState.loaded = true;
}

export function hydrateLists(lists: List[], selectedId: string | null) {
	listsState.items = lists;
	listsState.selectedId = selectedId;
	listsState.loaded = true;
}

export function selectList(id: string) {
	listsState.selectedId = id;
}

export function bumpListPendingCount(id: string, delta: number) {
	const list = listsState.items.find((l) => l.id === id);
	if (list) list.pending_count = Math.max(0, list.pending_count + delta);
}

function nextSortOrder() {
	return listsState.items.length > 0 ? Math.max(...listsState.items.map((l) => l.sort_order)) + 1 : 0;
}

export function addList(name: string, description = '') {
	const tempId = `temp-${crypto.randomUUID()}`;
	const list: List = {
		id: tempId,
		name,
		description,
		created_at: Date.now(),
		sort_order: nextSortOrder(),
		pending_count: 0
	};
	listsState.items.push(list);
	if (!listsState.selectedId && name !== SEPARATOR_NAME) listsState.selectedId = tempId;

	fetch('/api/lists', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name, description })
	})
		.then(async (res) => {
			if (!res.ok) throw new Error('failed');
			const created: List = await res.json();
			const idx = listsState.items.findIndex((l) => l.id === tempId);
			if (idx !== -1) listsState.items[idx] = created;
			if (listsState.selectedId === tempId) listsState.selectedId = created.id;
		})
		.catch(() => {
			listsState.items = listsState.items.filter((l) => l.id !== tempId);
			if (listsState.selectedId === tempId) {
				listsState.selectedId = firstSelectableId();
			}
		});
}

/** Appends a divider. It's just a list row, so reorder/delete need no special casing. */
export function addSeparator() {
	addList(SEPARATOR_NAME);
}

export function updateList(id: string, name: string, description: string) {
	const list = listsState.items.find((l) => l.id === id);
	if (!list) return;
	const prev = { name: list.name, description: list.description };
	list.name = name;
	list.description = description;

	const rollback = () => Object.assign(list, prev);

	fetch(`/api/lists/${id}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name, description })
	})
		.then((res) => {
			if (!res.ok) rollback();
		})
		.catch(rollback);
}

export function removeList(id: string) {
	const idx = listsState.items.findIndex((l) => l.id === id);
	if (idx === -1) return;
	const [removed] = listsState.items.splice(idx, 1);
	if (listsState.selectedId === id) {
		listsState.selectedId = firstSelectableId();
	}

	// fetch only rejects on network failure, so a 401/500 must be turned into a
	// throw explicitly or the list stays gone locally while the server still has it.
	fetch(`/api/lists/${id}`, { method: 'DELETE' })
		.then((res) => {
			if (!res.ok) throw new Error('failed');
		})
		.catch(() => {
			listsState.items.splice(idx, 0, removed);
			if (listsState.selectedId === null) listsState.selectedId = removed.id;
		});
}

export function reorderLists(orderedIds: string[]) {
	const prevItems = listsState.items;
	const byId = new Map(prevItems.map((l) => [l.id, l]));
	const reordered = orderedIds.map((id) => byId.get(id)).filter((l): l is List => !!l);
	if (reordered.length !== prevItems.length) return;

	listsState.items = reordered;

	fetch('/api/lists/reorder', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ order: orderedIds })
	})
		.then((res) => {
			if (!res.ok) throw new Error('failed');
		})
		.catch(() => {
			listsState.items = prevItems;
		});
}
