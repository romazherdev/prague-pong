import { clubRequest } from '#lib/server/request.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const { core, club, member } = clubRequest(event);
	if (!member) return { events: null };
	return { events: core.myUpcomingEvents(member.actor, club.id) };
};
