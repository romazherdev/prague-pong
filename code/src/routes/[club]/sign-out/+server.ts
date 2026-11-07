import { redirect, type RequestHandler } from '@sveltejs/kit';
import { appCore, SESSION_COOKIE } from '#lib/server/app.js';

export const POST: RequestHandler = ({ cookies, params }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (token) appCore().signOut(token);
	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(303, `/${params.club}`);
};
