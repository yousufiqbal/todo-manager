import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	const id = randomUUID();
	const created_at = Date.now();
	const maxOrderResult = await db.execute('SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM lists');
	const sortOrder = Number(maxOrderResult.rows[0].max_order) + 1;

	await db.execute({
		sql: 'INSERT INTO lists (id, name, created_at, sort_order, is_separator) VALUES (?, ?, ?, ?, 1)',
		args: [id, '', created_at, sortOrder]
	});

	return json({ id, name: '', created_at, sort_order: sortOrder, pending_count: 0, is_separator: 1 });
};
