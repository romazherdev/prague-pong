import { redirect, type RequestHandler } from '@sveltejs/kit';
import { isLocale } from '#lib/i18n/locales.js';
import { appCore, LANGUAGE_COOKIE, MEMBER_COOKIE, SESSION_COOKIE } from '#lib/server/app.js';
import { sameSitePath } from '#lib/server/safe-redirect.js';

/**
 * Saves the chosen language on this device and with the device's member, if any (personal-link cookie or
 * session), so it follows them to other devices. Then goes back to the page the visitor came from.
 */
export const POST: RequestHandler = async ({ request, cookies, url }) => {
	const form = await request.formData();
	const lang = form.get('lang') ?? undefined;
	if (isLocale(lang)) {
		cookies.set(LANGUAGE_COOKIE, lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
		appCore().saveLanguageForDevice(
			{ linkToken: cookies.get(MEMBER_COOKIE), sessionToken: cookies.get(SESSION_COOKIE) },
			lang
		);
	}
	redirect(303, sameSitePath(form.get('redirectTo'), url.origin));
};
