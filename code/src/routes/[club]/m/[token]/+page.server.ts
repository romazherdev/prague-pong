import { redirect } from '@sveltejs/kit';
import { MEMBER_COOKIE } from '#lib/server/app.js';
import { clubRequest, rememberMember } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

/**
 * A member's personal link. Remembers the member on this device, then shows their events at /<club>/me,
 * so the secret doesn't stay in the address bar or get bookmarked. If the device already belongs to a
 * different member, it asks first, so someone can't quietly swap another person's identity by sending
 * them their own link.
 */
export const load: PageServerLoad = (event) => {
	const { core, club, member: current } = clubRequest(event);
	const owner = core.memberByPersonalLink(club.id, event.params.token);
	if (!owner) return { invalid: true as const };
	if (current && current.actor.memberId !== owner.actor.memberId) {
		return { switchFrom: current.name, switchTo: owner.name };
	}
	if (event.cookies.get(MEMBER_COOKIE) !== event.params.token) rememberMember(event.cookies, event.params.token);
	redirect(303, `/${club.slug}/me`);
};

export const actions: Actions = {
	default: (event) => {
		const { core, club } = clubRequest(event);
		if (core.memberByPersonalLink(club.id, event.params.token)) rememberMember(event.cookies, event.params.token);
		redirect(303, `/${club.slug}/me`);
	}
};
