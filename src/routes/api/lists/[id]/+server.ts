import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const sets: string[] = [];
	const args: string[] = [];

	if ('name' in body) {
		if (!body.name || !body.name.trim()) {
			return json({ error: 'name cannot be empty' }, { status: 400 });
		}
		sets.push('name = ?');
		args.push(body.name.trim());
	}
	// Absent means "leave alone"; an empty string is a valid way to clear it.
	if ('description' in body) {
		sets.push('description = ?');
		args.push(typeof body.description === 'string' ? body.description.trim() : '');
	}
	if (sets.length === 0) {
		return json({ error: 'no fields to update' }, { status: 400 });
	}

	args.push(params.id);
	await db.execute({ sql: `UPDATE lists SET ${sets.join(', ')} WHERE id = ?`, args });

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params }) => {
	await db.batch(
		[
			{ sql: 'DELETE FROM todos WHERE list_id = ?', args: [params.id] },
			{ sql: 'DELETE FROM lists WHERE id = ?', args: [params.id] }
		],
		'write'
	);
	return json({ ok: true });
};
