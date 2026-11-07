import type { Handle } from '@sveltejs/kit/hooks';
import { appCore, LANGUAGE_COOKIE, MEMBER_COOKIE, SESSION_COOKIE } from '#lib/server/app.js';

export const handle: Handle = async ({ event, resolve }) => {
	const core = appCore();
	event.locals.locale = core.resolveLocale({
		memberPreference: core.savedLanguage({
			linkToken: event.cookies.get(MEMBER_COOKIE),
			sessionToken: event.cookies.get(SESSION_COOKIE)
		}),
		devicePreference: event.cookies.get(LANGUAGE_COOKIE),
		acceptLanguage: event.request.headers.get('accept-language') ?? undefined
	});
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale)
	});
};
