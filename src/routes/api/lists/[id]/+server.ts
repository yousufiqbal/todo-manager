import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const { name } = await request.json();
	if (!name || !name.trim()) {
		return json({ error: 'name required' }, { status: 400 });
	}

	await db.execute({
		sql: 'UPDATE lists SET name = ? WHERE id = ?',
		args: [name.trim(), params.id]
	});

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
