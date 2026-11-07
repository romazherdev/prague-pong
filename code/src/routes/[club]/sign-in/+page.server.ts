import { fail } from '@sveltejs/kit';
import { publicOrigin } from '#lib/server/app.js';
import { SIGN_IN_LINK_MINUTES } from '#lib/server/core/access.js';
import { clubRequest } from '#lib/server/request.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const { core, club } = clubRequest(event);
		const email = String((await event.request.formData()).get('email') ?? '').trim();
		if (!/^\S+@\S+\.\S+$/.test(email)) return fail(400, { email, invalid: true });
		// Not awaited, and failures only logged: the answer must look and take the same for any address,
		// so the form doesn't reveal who has an account.
		core
			.requestSignIn(club.id, email, { origin: publicOrigin(event.url), locale: event.locals.locale })
			.catch((e) => console.error('[sign-in] sending the link failed', e));
		return { sent: true, email, minutes: SIGN_IN_LINK_MINUTES };
	}
};
