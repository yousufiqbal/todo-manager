import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db.js';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET: RequestHandler = async ({ url }) => {
	const listId = url.searchParams.get('listId');
	if (!listId) {
		return json({ error: 'listId required' }, { status: 400 });
	}

	const result = await db.execute({
		sql: 'SELECT * FROM todos WHERE list_id = ? ORDER BY date ASC, created_at ASC',
		args: [listId]
	});
	return json(result.rows);
};

export const POST: RequestHandler = async ({ request }) => {
	const { list_id, title, date } = await request.json();
	if (!list_id || !title || !title.trim() || !DATE_RE.test(date || '')) {
		return json({ error: 'list_id, title, date required' }, { status: 400 });
	}

	const id = randomUUID();
	const created_at = Date.now();
	await db.execute({
		sql: 'INSERT INTO todos (id, list_id, title, done, date, created_at) VALUES (?, ?, ?, 0, ?, ?)',
		args: [id, list_id, title.trim(), date, created_at]
	});

	return json({ id, list_id, title: title.trim(), done: 0, date, created_at });
};
