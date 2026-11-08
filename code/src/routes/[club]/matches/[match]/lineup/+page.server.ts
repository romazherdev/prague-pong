import { publicOrigin } from '#lib/server/app.js';
import { clubRequest, guarded, guardedForm, matchMessages } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const req = clubRequest(event);
	return guarded(req, () => ({
		...req.core.lineupView(req.actor, req.club.id, event.params.match),
		whatsapp: matchMessages(req, event.params.match, publicOrigin(event.url))
	}));
};

export const actions: Actions = {
	reviewed: (event) => {
		const req = clubRequest(event);
		return guardedForm(req, () => {
			req.core.markLineupReviewed(req.actor, req.club.id, event.params.match);
			return { reviewed: true };
		});
	},
	save: async (event) => {
		const req = clubRequest(event);
		const memberIds = (await event.request.formData()).getAll('memberId').map(String);
		return guardedForm(req, () => ({ saved: true, ...req.core.setLineup(req.actor, req.club.id, event.params.match, memberIds) }));
	}
};
