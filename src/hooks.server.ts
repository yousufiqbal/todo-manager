import { redirect, type Handle } from '@sveltejs/kit';
import { getSessionCookie, verifySessionToken } from '$lib/server/auth.js';

const PUBLIC_PATHS = new Set(['/login', '/api/auth/login']);

export const handle: Handle = async ({ event, resolve }) => {
	const token = getSessionCookie(event.cookies);
	const authed = verifySessionToken(token);
	event.locals.authed = authed;

	const isPublic = PUBLIC_PATHS.has(event.url.pathname);

	if (!authed && !isPublic) {
		if (event.url.pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'unauthorized' }), {
				status: 401,
				headers: { 'content-type': 'application/json' }
			});
		}
		throw redirect(303, '/login');
	}

	if (authed && event.url.pathname === '/login') {
		throw redirect(303, '/');
	}

	return resolve(event);
};
