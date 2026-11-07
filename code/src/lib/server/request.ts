import { error, redirect, type Cookies } from '@sveltejs/kit';
import { translator } from '#lib/i18n/messages.js';
import type { Locale } from '#lib/i18n/locales.js';
import { appCore, SESSION_COOKIE } from './app';
import { ForbiddenError, NotFoundError } from './core/access';

/** The club in the URL and whoever is signed in to it. 404 if there's no such club. */
export function clubRequest(event: { params: { club?: string }; cookies: Cookies; locals: { locale: Locale } }) {
	const core = appCore();
	const club = core.findClubBySlug(event.params.club ?? '');
	if (!club) error(404, translator(event.locals.locale)('club.notFound'));
	const signedIn = core.whoIsSignedIn(club.id, event.cookies.get(SESSION_COOKIE));
	return { core, club, signedIn, actor: signedIn?.actor };
}

/**
 * Runs a core call and turns its refusals into HTTP: no session → the sign-in page,
 * not allowed → 403, unknown record → 404.
 */
export function guarded<T>(req: { club: { slug: string }; signedIn: unknown }, fn: () => T): T {
	try {
		return fn();
	} catch (e) {
		if (e instanceof ForbiddenError) {
			if (!req.signedIn) redirect(303, `/${req.club.slug}/sign-in`);
			error(403, e.message);
		}
		if (e instanceof NotFoundError) error(404, e.message);
		throw e;
	}
}
