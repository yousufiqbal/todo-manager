import { db } from '$lib/server/db.js';
import type { List } from '$lib/stores/lists.svelte.js';
import type { Todo } from '$lib/stores/todos.svelte.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const [listsResult, todosResult] = await Promise.all([
		db.execute(`
			SELECT lists.*, COUNT(CASE WHEN todos.done = 0 THEN 1 END) AS pending_count
			FROM lists
			LEFT JOIN todos ON todos.list_id = lists.id
			GROUP BY lists.id
			ORDER BY lists.sort_order ASC
		`),
		db.execute('SELECT * FROM todos ORDER BY list_id ASC, date ASC, created_at DESC')
	]);

	const lists = listsResult.rows as unknown as List[];

	// Seed every list up front, not just the ones with rows: a list left without an
	// entry looks like a cache miss on the client and triggers a needless fetch +
	// spinner, which is exactly what preloading here is meant to avoid.
	const todosByList: Record<string, Todo[]> = {};
	for (const list of lists) todosByList[list.id] = [];
	for (const row of todosResult.rows as unknown as Todo[]) {
		(todosByList[row.list_id] ??= []).push(row);
	}

	const requestedId = url.searchParams.get('list');
	const requestedIsValid = requestedId && lists.some((l) => l.id === requestedId);
	const selectedListId = (requestedIsValid ? requestedId : lists[0]?.id) ?? null;

	return { lists, todosByList, selectedListId };
};
