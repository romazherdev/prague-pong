import { redirect, type RequestHandler } from '@sveltejs/kit';
import { isLocale } from '#lib/i18n/locales.js';
import { LANGUAGE_COOKIE } from '#lib/server/app.js';

/** Saves the chosen language on this device and goes back to the page the visitor came from. */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const form = await request.formData();
	const lang = form.get('lang') ?? undefined;
	if (isLocale(lang)) {
		cookies.set(LANGUAGE_COOKIE, lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
	}
	const back = String(form.get('redirectTo') ?? '/');
	redirect(303, back.startsWith('/') && !back.startsWith('//') ? back : '/');
};
