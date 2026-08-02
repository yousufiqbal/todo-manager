import { bumpListPendingCount } from './lists.svelte.js';

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
		// Show cached data instantly, then silently refresh in the background.
		todosState.items = cached;
		todosState.loadedForListId = listId;
	}

	const res = await fetch(`/api/todos?listId=${listId}`);
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
	todosState.items.push(todo);
	bumpListPendingCount(listId, 1);

	fetch('/api/todos', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ list_id: listId, title, date })
	})
		.then(async (res) => {
			if (!res.ok) throw new Error('failed');
			const created: Todo = await res.json();
			const idx = todosState.items.findIndex((t) => t.id === tempId);
			if (idx !== -1) todosState.items[idx] = created;
		})
		.catch(() => {
			todosState.items = todosState.items.filter((t) => t.id !== tempId);
			todosCache.set(listId, todosState.items);
			bumpListPendingCount(listId, -1);
		});
}

function patchTodo(id: string, patch: Partial<Todo>, rollbackFields: (keyof Todo)[]) {
	const todo = todosState.items.find((t) => t.id === id);
	if (!todo) return;
	const prev: Partial<Todo> = {};
	for (const key of rollbackFields) (prev as any)[key] = todo[key];
	Object.assign(todo, patch);

	fetch(`/api/todos/${id}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(patch)
	})
		.then((res) => {
			if (!res.ok) Object.assign(todo, prev);
		})
		.catch(() => {
			Object.assign(todo, prev);
		});
}

export function toggleTodo(id: string, done: boolean) {
	const todo = todosState.items.find((t) => t.id === id);
	if (!todo) return;
	const wasDone = !!todo.done;
	if (wasDone === done) return;

	todo.done = done ? 1 : 0;
	bumpListPendingCount(todo.list_id, done ? -1 : 1);

	fetch(`/api/todos/${id}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ done: done ? 1 : 0 })
	})
		.then((res) => {
			if (!res.ok) throw new Error('failed');
		})
		.catch(() => {
			todo.done = wasDone ? 1 : 0;
			bumpListPendingCount(todo.list_id, done ? 1 : -1);
		});
}

export function editTodoTitle(id: string, title: string) {
	patchTodo(id, { title }, ['title']);
}

export function moveTodoDate(id: string, date: string) {
	patchTodo(id, { date }, ['date']);
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

	const todo = undoState.todo;
	const idx = Math.min(pendingDeleteIndex, todosState.items.length);
	todosState.items.splice(idx, 0, todo);
	if (!todo.done) bumpListPendingCount(todo.list_id, 1);

	pendingDeleteId = null;
	undoState.todo = null;
}
