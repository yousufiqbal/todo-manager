import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { order } = await request.json();
	if (!Array.isArray(order) || order.some((id) => typeof id !== 'string')) {
		return json({ error: 'order must be an array of list ids' }, { status: 400 });
	}

	await db.batch(
		order.map((id: string, index: number) => ({
			sql: 'UPDATE lists SET sort_order = ? WHERE id = ?',
			args: [index, id]
		})),
		'write'
	);

	return json({ ok: true });
};
