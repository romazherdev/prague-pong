import type { Handle } from '@sveltejs/kit/hooks';
import { appCore, LANGUAGE_COOKIE } from '#lib/server/app.js';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.locale = appCore().resolveLocale({
		devicePreference: event.cookies.get(LANGUAGE_COOKIE),
		acceptLanguage: event.request.headers.get('accept-language') ?? undefined
	});
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale)
	});
};
