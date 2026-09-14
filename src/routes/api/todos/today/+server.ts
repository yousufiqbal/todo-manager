import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Every list's todos for one date. The date comes from the client because
 * "today" is the user's local day, which the server's clock can't be trusted
 * to agree on.
 */
export const GET: RequestHandler = async ({ url }) => {
	const date = url.searchParams.get('date');
	if (!DATE_RE.test(date || '')) {
		return json({ error: 'valid date required' }, { status: 400 });
	}

	const result = await db.execute({
		sql: `SELECT todos.*, lists.name AS list_name
			FROM todos
			JOIN lists ON lists.id = todos.list_id
			WHERE todos.date = ?
			ORDER BY lists.sort_order ASC, todos.sort_order ASC, todos.created_at DESC`,
		args: [date]
	});

	return json(result.rows);
};
