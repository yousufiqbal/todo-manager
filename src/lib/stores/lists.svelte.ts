export interface List {
	id: string;
	name: string;
	created_at: number;
	pending_count: number;
}

export const listsState = $state<{ items: List[]; selectedId: string | null; loaded: boolean }>({
	items: [],
	selectedId: null,
	loaded: false
});

export async function loadLists() {
	const res = await fetch('/api/lists');
	if (res.ok) {
		listsState.items = await res.json();
		if (!listsState.selectedId && listsState.items.length > 0) {
			listsState.selectedId = listsState.items[0].id;
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

export function addList(name: string) {
	const tempId = `temp-${crypto.randomUUID()}`;
	const list: List = { id: tempId, name, created_at: Date.now(), pending_count: 0 };
	listsState.items.push(list);
	if (!listsState.selectedId) listsState.selectedId = tempId;

	fetch('/api/lists', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name })
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
			if (listsState.selectedId === tempId) listsState.selectedId = listsState.items[0]?.id ?? null;
		});
}

export function renameList(id: string, name: string) {
	const list = listsState.items.find((l) => l.id === id);
	if (!list) return;
	const prevName = list.name;
	list.name = name;

	fetch(`/api/lists/${id}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name })
	})
		.then((res) => {
			if (!res.ok) list.name = prevName;
		})
		.catch(() => {
			list.name = prevName;
		});
}

export function removeList(id: string) {
	const idx = listsState.items.findIndex((l) => l.id === id);
	if (idx === -1) return;
	const [removed] = listsState.items.splice(idx, 1);
	if (listsState.selectedId === id) {
		listsState.selectedId = listsState.items[0]?.id ?? null;
	}

	fetch(`/api/lists/${id}`, { method: 'DELETE' }).catch(() => {
		listsState.items.splice(idx, 0, removed);
	});
}
