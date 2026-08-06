import { bumpListPendingCount } from './lists.svelte.js';
import { todayLocalStr } from '$lib/date.js';

export interface Todo {
	id: string;
	list_id: string;
	title: string;
	done: number;
	date: string;
	created_at: number;
}

export const todosState = $state<{ items: Todo[]; loadedForListId: string | null }>({
	items: [],
	loadedForListId: null
});

const UNDO_WINDOW_MS = 5000;
const todosCache = new Map<string, Todo[]>();

export const undoState = $state<{ todo: Todo | null }>({ todo: null });

let pendingDeleteId: string | null = null;
let pendingDeleteIndex = -1;
let pendingDeleteTimeout: ReturnType<typeof setTimeout> | null = null;
let latestRequestedListId: string | null = null;

/**
 * Cache is a plain (non-reactive) Map, but todosState.items is a Svelte 5
 * reactive $state proxy. Relying on the two sharing an object reference after
 * mutation is fragile, so every mutation explicitly snapshots the current
 * (proxied) state into a plain array and writes it into the cache for the
 * list it belongs to.
 *
 * Mutations fire from async fetch callbacks that can resolve *after* the user
 * switched lists, at which point todosState.items holds a different list — so
 * snapshotting it into `listId` would poison that list's cache. In that case
 * drop the entry instead and let the next visit refetch; the server already
 * has (or rejected) the change, so a refetch is always authoritative.
 */
function syncCache(listId: string) {
	if (todosState.loadedForListId !== listId) {
		todosCache.delete(listId);
		return;
	}
	todosCache.set(listId, $state.snapshot(todosState.items) as Todo[]);
}

/** True when `listId` is the list currently rendered, i.e. safe to mutate live state. */
function isLive(listId: string) {
	return todosState.loadedForListId === listId;
}

export function hydrateAllTodos(todosByList: Record<string, Todo[]>, selectedListId: string | null) {
	for (const [listId, todos] of Object.entries(todosByList)) {
		todosCache.set(listId, todos);
	}
	latestRequestedListId = selectedListId;
	if (selectedListId) {
		todosState.items = todosCache.get(selectedListId) ?? [];
		todosState.loadedForListId = selectedListId;
	}
}

export async function loadTodos(listId: string | null) {
	latestRequestedListId = listId;

	if (!listId) {
		todosState.items = [];
		todosState.loadedForListId = null;
		return;
	}

	const cached = todosCache.get(listId);
	if (cached) {
		// Trust the cache once populated — every local mutation keeps it in sync
		// explicitly, and this is a single-device app so nothing else can
		// change server data underneath us. Re-fetching here would just race
		// with in-flight optimistic writes and flicker stale data back in.
		todosState.items = cached;
		todosState.loadedForListId = listId;
		return;
	}

	const res = await fetch(`/api/todos?listId=${encodeURIComponent(listId)}`);
	if (res.ok) {
		const fresh: Todo[] = await res.json();
		todosCache.set(listId, fresh);
		// Ignore stale responses from a list the user has since navigated away from.
		if (latestRequestedListId === listId) {
			todosState.items = fresh;
			todosState.loadedForListId = listId;
		}
	}
}

export function addTodo(listId: string, title: string, date: string) {
	const tempId = `temp-${crypto.randomUUID()}`;
	const todo: Todo = { id: tempId, list_id: listId, title, done: 0, date, created_at: Date.now() };
	todosState.items.unshift(todo);
	syncCache(listId);
	bumpListPendingCount(listId, 1);

	fetch('/api/todos', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ list_id: listId, title, date })
	})
		.then(async (res) => {
			if (!res.ok) throw new Error('failed');
			const created: Todo = await res.json();
			if (isLive(listId)) {
				const idx = todosState.items.findIndex((t) => t.id === tempId);
				if (idx !== -1) todosState.items[idx] = created;
			}
			syncCache(listId);
		})
		.catch(() => {
			if (isLive(listId)) {
				todosState.items = todosState.items.filter((t) => t.id !== tempId);
			}
			syncCache(listId);
			bumpListPendingCount(listId, -1);
		});
}

function patchTodo(id: string, patch: Partial<Todo>, rollbackFields: (keyof Todo)[]) {
	const todo = todosState.items.find((t) => t.id === id);
	if (!todo) return;
	const listId = todo.list_id;
	const prev: Partial<Todo> = {};
	for (const key of rollbackFields) (prev as any)[key] = todo[key];
	Object.assign(todo, patch);
	syncCache(listId);

	fetch(`/api/todos/${id}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(patch)
	})
		.then((res) => {
			if (!res.ok) throw new Error('failed');
		})
		.catch(() => {
			// Re-look-up rather than reusing `todo`: navigating away and back
			// rebuilds items from the cache, leaving the captured reference
			// detached from what's rendered.
			const current = isLive(listId) ? todosState.items.find((t) => t.id === id) : undefined;
			if (current) Object.assign(current, prev);
			syncCache(listId);
		});
}

export function toggleTodo(id: string, done: boolean) {
	const todo = todosState.items.find((t) => t.id === id);
	if (!todo) return;
	const wasDone = !!todo.done;
	if (wasDone === done) return;

	const listId = todo.list_id;
	todo.done = done ? 1 : 0;
	syncCache(listId);
	bumpListPendingCount(listId, done ? -1 : 1);

	fetch(`/api/todos/${id}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ done: done ? 1 : 0 })
	})
		.then((res) => {
			if (!res.ok) throw new Error('failed');
		})
		.catch(() => {
			const current = isLive(listId) ? todosState.items.find((t) => t.id === id) : undefined;
			if (current) current.done = wasDone ? 1 : 0;
			syncCache(listId);
			bumpListPendingCount(listId, done ? 1 : -1);
		});
}

export function editTodoTitle(id: string, title: string) {
	patchTodo(id, { title }, ['title']);
}

export function moveTodoDate(id: string, date: string) {
	patchTodo(id, { date }, ['date']);
}

/**
 * Moves every pending todo in *every* list to today. Done server-side in one
 * statement rather than looping moveTodoDate, which would fire one request per
 * todo. Pending counts are untouched — shifting a date doesn't change `done`.
 */
export function moveAllPendingToTodayEverywhere() {
	const today = todayLocalStr();

	const prevCache = new Map([...todosCache].map(([id, todos]) => [id, todos.map((t) => ({ ...t }))]));

	for (const todo of todosState.items) {
		if (!todo.done) todo.date = today;
	}
	for (const [id, todos] of todosCache) {
		todosCache.set(
			id,
			todos.map((t) => (t.done ? t : { ...t, date: today }))
		);
	}
	if (todosState.loadedForListId) syncCache(todosState.loadedForListId);

	fetch('/api/todos/move-all-today', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ date: today })
	})
		.then((res) => {
			if (!res.ok) throw new Error('failed');
		})
		.catch(() => {
			// Rebuild live items from the restored cache rather than a captured
			// array, so a list switch mid-flight still lands on the right data.
			todosCache.clear();
			for (const [id, todos] of prevCache) todosCache.set(id, todos);
			const live = todosState.loadedForListId;
			if (live) todosState.items = todosCache.get(live) ?? [];
		});
}

export function moveAllPendingToToday(listId: string) {
	const today = todayLocalStr();
	const pendingIds = todosState.items
		.filter((t) => t.list_id === listId && !t.done && t.date !== today)
		.map((t) => t.id);
	for (const id of pendingIds) {
		moveTodoDate(id, today);
	}
}

function finalizePendingDelete() {
	if (!pendingDeleteId) return;
	const id = pendingDeleteId;
	pendingDeleteId = null;
	if (pendingDeleteTimeout) clearTimeout(pendingDeleteTimeout);
	pendingDeleteTimeout = null;
	undoState.todo = null;

	fetch(`/api/todos/${id}`, { method: 'DELETE' }).catch(() => {
		// Best-effort: if this fails, the todo silently persists server-side
		// with no local trace; acceptable for this app's scope.
	});
}

export function removeTodo(id: string) {
	finalizePendingDelete();

	const idx = todosState.items.findIndex((t) => t.id === id);
	if (idx === -1) return;
	const [removed] = todosState.items.splice(idx, 1);
	syncCache(removed.list_id);
	if (!removed.done) bumpListPendingCount(removed.list_id, -1);

	pendingDeleteId = id;
	pendingDeleteIndex = idx;
	undoState.todo = removed;
	pendingDeleteTimeout = setTimeout(finalizePendingDelete, UNDO_WINDOW_MS);
}

export function undoRemoveTodo() {
	if (!pendingDeleteId || !undoState.todo) return;
	if (pendingDeleteTimeout) clearTimeout(pendingDeleteTimeout);
	pendingDeleteTimeout = null;

	const todo = $state.snapshot(undoState.todo) as Todo;
	const listId = todo.list_id;

	// The undo toast outlives a list switch, so restore into the list the todo
	// actually belongs to — not whatever happens to be on screen.
	if (isLive(listId)) {
		todosState.items.splice(Math.min(pendingDeleteIndex, todosState.items.length), 0, todo);
		syncCache(listId);
	} else {
		const cached = todosCache.get(listId);
		// No cache entry means the next visit refetches, and the server still has
		// the todo (the DELETE never fired), so there is nothing to restore here.
		if (cached) cached.splice(Math.min(pendingDeleteIndex, cached.length), 0, todo);
	}

	if (!todo.done) bumpListPendingCount(listId, 1);

	pendingDeleteId = null;
	pendingDeleteIndex = -1;
	undoState.todo = null;
}
