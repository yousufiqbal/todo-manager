import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Moves every pending todo across all lists onto `date` in one statement.
 * The date comes from the client because "today" is the user's local day, which
 * the server's clock can't be trusted to agree on.
 */
export const POST: RequestHandler = async ({ request }) => {
	const { date } = await request.json();
	if (!DATE_RE.test(date || '')) {
		return json({ error: 'valid date required' }, { status: 400 });
	}

	const result = await db.execute({
		sql: 'UPDATE todos SET date = ? WHERE done = 0 AND date != ?',
		args: [date, date]
	});

	return json({ ok: true, moved: result.rowsAffected });
};
