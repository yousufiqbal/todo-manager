import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const PATCH: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const sets: string[] = [];
	const args: (string | number)[] = [];

	if ('done' in body) {
		sets.push('done = ?');
		args.push(body.done ? 1 : 0);
	}
	if ('title' in body) {
		if (!body.title || !body.title.trim()) {
			return json({ error: 'title cannot be empty' }, { status: 400 });
		}
		sets.push('title = ?');
		args.push(body.title.trim());
	}
	if ('date' in body) {
		if (!DATE_RE.test(body.date)) {
			return json({ error: 'invalid date' }, { status: 400 });
		}
		sets.push('date = ?');
		args.push(body.date);
	}

	if (sets.length === 0) {
		return json({ error: 'no fields to update' }, { status: 400 });
	}

	args.push(params.id);
	await db.execute({ sql: `UPDATE todos SET ${sets.join(', ')} WHERE id = ?`, args });

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params }) => {
	await db.execute({ sql: 'DELETE FROM todos WHERE id = ?', args: [params.id] });
	return json({ ok: true });
};
