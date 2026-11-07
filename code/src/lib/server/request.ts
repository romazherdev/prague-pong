import { error, fail, redirect, type Cookies } from '@sveltejs/kit';
import { translator } from '#lib/i18n/messages.js';
import type { Locale } from '#lib/i18n/locales.js';
import { appCore, MEMBER_COOKIE, SESSION_COOKIE } from './app';
import { ForbiddenError, InvalidInputError, NotFoundError } from './core/access';
import { isMatchAnswer } from './core/responses';

/**
 * The club in the URL, whoever is signed in to it (session) and the member whose personal link this device
 * holds. 404 if there's no such club.
 */
export function clubRequest(event: { params: { club?: string }; cookies: Cookies; locals: { locale: Locale } }) {
	const core = appCore();
	const club = core.findClubBySlug(event.params.club ?? '');
	if (!club) error(404, translator(event.locals.locale)('club.notFound'));
	const signedIn = core.whoIsSignedIn(club.id, event.cookies.get(SESSION_COOKIE));
	const member = core.memberByPersonalLink(club.id, event.cookies.get(MEMBER_COOKIE));
	return { core, club, signedIn, actor: signedIn?.actor, member, locale: event.locals.locale };
}

/**
 * Runs a core call and turns its refusals into HTTP: no session → the sign-in page,
 * not allowed → 403, unknown record → 404.
 */
export function guarded<T>(req: { club: { slug: string }; signedIn: unknown; locale: Locale }, fn: () => T): T {
	try {
		return fn();
	} catch (e) {
		if (e instanceof ForbiddenError) {
			if (!req.signedIn) redirect(303, `/${req.club.slug}/sign-in`);
			error(403, translator(req.locale)('error.forbidden'));
		}
		if (e instanceof NotFoundError) error(404, translator(req.locale)('error.notFound'));
		throw e;
	}
}

/** Like `guarded`, for form actions: a rule the input breaks becomes a 400 with its code, for the form to show. */
export function guardedForm<T>(req: Parameters<typeof guarded>[0], fn: () => T) {
	try {
		return guarded(req, fn);
	} catch (e) {
		if (e instanceof InvalidInputError) return fail(400, { error: e.code });
		throw e;
	}
}

/** Sets the personal-link cookie for a year. */
export function rememberMember(cookies: Cookies, token: string) {
	cookies.set(MEMBER_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
}

/**
 * Handles an answer form (AnswerButtons): records the answer of the device's member (personal link,
 * else the signed-in member).
 */
export async function answerAction(event: Parameters<typeof clubRequest>[0] & { request: Request }) {
	const req = clubRequest(event);
	const form = await event.request.formData();
	const matchId = String(form.get('matchId') ?? '');
	const answer = form.get('answer');
	if (!isMatchAnswer(answer)) return fail(400, { error: 'answerInvalid' as const });
	return guardedForm(req, () => {
		req.core.recordResponse(req.member?.actor ?? req.actor, req.club.id, matchId, answer);
		return { answered: matchId };
	});
}
