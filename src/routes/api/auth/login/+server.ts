import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { env } from '$env/dynamic/private';
import { createSessionToken, setSessionCookie } from '$lib/server/auth.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { email, password } = await request.json();

	if (!email || !password) {
		return json({ error: 'email and password required' }, { status: 400 });
	}

	if (email !== env.ADMIN_EMAIL) {
		return json({ error: 'invalid credentials' }, { status: 401 });
	}

	const valid = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
	if (!valid) {
		return json({ error: 'invalid credentials' }, { status: 401 });
	}

	setSessionCookie(cookies, createSessionToken(email));
	return json({ ok: true });
};
