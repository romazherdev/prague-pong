import { redirect, type RequestHandler } from '@sveltejs/kit';
import { isLocale } from '#lib/i18n/locales.js';
import { appCore, LANGUAGE_COOKIE, MEMBER_COOKIE } from '#lib/server/app.js';

/**
 * Saves the chosen language on this device and, when the device holds a member's personal link, with the
 * member too (so it follows them to other devices). Then goes back to the page the visitor came from.
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const form = await request.formData();
	const lang = form.get('lang') ?? undefined;
	if (isLocale(lang)) {
		cookies.set(LANGUAGE_COOKIE, lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
		const core = appCore();
		const club = core.findClubBySlug(String(form.get('club') ?? ''));
		const member = club && core.memberByPersonalLink(club.id, cookies.get(MEMBER_COOKIE));
		if (club && member) core.setMyLanguage(member.actor, club.id, lang);
	}
	const back = String(form.get('redirectTo') ?? '/');
	redirect(303, back.startsWith('/') && !back.startsWith('//') ? back : '/');
};
