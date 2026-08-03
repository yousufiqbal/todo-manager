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

	const todosByList: Record<string, Todo[]> = {};
	for (const row of todosResult.rows as unknown as Todo[]) {
		(todosByList[row.list_id] ??= []).push(row);
	}

	const requestedId = url.searchParams.get('list');
	const requestedIsValid = requestedId && lists.some((l) => l.id === requestedId && !l.is_separator);
	const selectedListId = (requestedIsValid ? requestedId : lists.find((l) => !l.is_separator)?.id) ?? null;

	return { lists, todosByList, selectedListId };
};
