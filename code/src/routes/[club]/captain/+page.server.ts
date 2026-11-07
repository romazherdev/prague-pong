import { clubRequest, guarded } from '#lib/server/request.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const req = clubRequest(event);
	return guarded(req, () => ({ matches: req.core.captainMatches(req.actor, req.club.id) }));
};
