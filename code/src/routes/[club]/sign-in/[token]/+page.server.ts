import { fail, redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '#lib/server/app.js';
import { SESSION_DAYS } from '#lib/server/core/access.js';
import { clubRequest } from '#lib/server/request.js';
import type { Actions } from './$types';

/**
 * Opening the emailed link shows a "sign in" button rather than signing in straight away: mail scanners
 * that prefetch links would otherwise use up the single-use link before the person clicks it.
 */
export const actions: Actions = {
	default: (event) => {
		const { core, club } = clubRequest(event);
		const session = core.signIn(club.id, event.params.token);
		if (!session) return fail(410, { expired: true });
		event.cookies.set(SESSION_COOKIE, session.sessionToken, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: SESSION_DAYS * 24 * 60 * 60
		});
		const who = core.whoIsSignedIn(club.id, session.sessionToken);
		redirect(303, who?.isAdmin ? `/${club.slug}/admin` : `/${club.slug}`);
	}
};
