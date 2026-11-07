import { redirect, type RequestHandler } from '@sveltejs/kit';
import { SESSION_COOKIE } from '#lib/server/app.js';
import { clubRequest } from '#lib/server/request.js';

export const POST: RequestHandler = (event) => {
	const { core, club } = clubRequest(event);
	const token = event.cookies.get(SESSION_COOKIE);
	if (token) core.signOut(token);
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(303, `/${club.slug}`);
};
