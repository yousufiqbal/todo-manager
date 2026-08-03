import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const result = await db.execute(`
		SELECT lists.*, COUNT(CASE WHEN todos.done = 0 THEN 1 END) AS pending_count
		FROM lists
		LEFT JOIN todos ON todos.list_id = lists.id
		GROUP BY lists.id
		ORDER BY lists.sort_order ASC
	`);
	return json(result.rows);
};

export const POST: RequestHandler = async ({ request }) => {
	const { name } = await request.json();
	if (!name || !name.trim()) {
		return json({ error: 'name required' }, { status: 400 });
	}

	const id = randomUUID();
	const created_at = Date.now();
	const maxOrderResult = await db.execute('SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM lists');
	const sortOrder = Number(maxOrderResult.rows[0].max_order) + 1;

	await db.execute({
		sql: 'INSERT INTO lists (id, name, created_at, sort_order) VALUES (?, ?, ?, ?)',
		args: [id, name.trim(), created_at, sortOrder]
	});

	return json({ id, name: name.trim(), created_at, sort_order: sortOrder, pending_count: 0 });
};
