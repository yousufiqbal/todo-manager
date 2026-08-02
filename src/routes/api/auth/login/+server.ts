import { json } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { createSessionToken, setSessionCookie } from '$lib/server/auth.js';
import type { RequestHandler } from './$types';

function safeEqual(a: string, b: string) {
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	if (bufA.length !== bufB.length) return false;
	return timingSafeEqual(bufA, bufB);
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { email, password } = await request.json();

	if (!email || !password) {
		return json({ error: 'email and password required' }, { status: 400 });
	}

	if (!safeEqual(email, env.ADMIN_EMAIL) || !safeEqual(password, env.ADMIN_PASSWORD)) {
		return json({ error: 'invalid credentials' }, { status: 401 });
	}

	setSessionCookie(cookies, createSessionToken(email));
	return json({ ok: true });
};
