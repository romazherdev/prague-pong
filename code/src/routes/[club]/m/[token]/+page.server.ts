import { redirect } from '@sveltejs/kit';
import { clubRequest, rememberMember } from '#lib/server/request.js';
import type { PageServerLoad } from './$types';

/**
 * A member's personal link. Remembers the member on this device, then shows their events at /<club>/me,
 * so the secret doesn't stay in the address bar or get bookmarked.
 */
export const load: PageServerLoad = (event) => {
	const { core, club } = clubRequest(event);
	if (!core.memberByPersonalLink(club.id, event.params.token)) return { invalid: true };
	rememberMember(event.cookies, event.params.token);
	redirect(303, `/${club.slug}/me`);
};
