import { fail } from '@sveltejs/kit';
import { clubRequest } from '#lib/server/request.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const { core, club } = clubRequest(event);
		const email = String((await event.request.formData()).get('email') ?? '').trim();
		if (!/^\S+@\S+\.\S+$/.test(email)) return fail(400, { email, invalid: true });
		await core.requestSignIn(club.id, email, { origin: event.url.origin, locale: event.locals.locale });
		return { sent: true, email };
	}
};
