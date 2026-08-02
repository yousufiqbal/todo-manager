import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

const SESSION_COOKIE = 'session';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function sign(payload: string) {
	return createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url');
}

export function createSessionToken(email: string) {
	const payload = JSON.stringify({ email, exp: Date.now() + MAX_AGE_MS });
	const payloadB64 = Buffer.from(payload).toString('base64url');
	const sig = sign(payloadB64);
	return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string | undefined) {
	if (!token) return false;
	const [payloadB64, sig] = token.split('.');
	if (!payloadB64 || !sig) return false;
	const expected = sign(payloadB64);
	const sigBuf = Buffer.from(sig);
	const expectedBuf = Buffer.from(expected);
	if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false;
	try {
		const { exp } = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
		return exp > Date.now();
	} catch {
		return false;
	}
}

export function setSessionCookie(cookies: Cookies, token: string) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: MAX_AGE_MS / 1000
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function getSessionCookie(cookies: Cookies) {
	return cookies.get(SESSION_COOKIE);
}
