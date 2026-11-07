import { clubRequest, guarded, guardedForm } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const req = clubRequest(event);
	return guarded(req, () => req.core.lineupView(req.actor, req.club.id, event.params.match));
};

export const actions: Actions = {
	default: async (event) => {
		const req = clubRequest(event);
		const memberIds = (await event.request.formData()).getAll('memberId').map(String);
		return guardedForm(req, () => ({ saved: true, ...req.core.setLineup(req.actor, req.club.id, event.params.match, memberIds) }));
	}
};
