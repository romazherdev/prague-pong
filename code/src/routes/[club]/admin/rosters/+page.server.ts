import { fail } from '@sveltejs/kit';
import { clubRequest, guarded } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const req = clubRequest(event);
	return guarded(req, () => ({
		entries: req.core.listRosterReview(req.actor, req.club.id),
		members: req.core.listMembers(req.actor, req.club.id)
	}));
};

export const actions: Actions = {
	confirm: async (event) => {
		const req = clubRequest(event);
		const form = await event.request.formData();
		const entryId = String(form.get('entryId') ?? '');
		const who = String(form.get('who') ?? '');
		if (!entryId || !who) return fail(400);
		guarded(req, () =>
			req.core.confirmRosterEntry(req.actor, req.club.id, entryId, who === 'new' ? { newMember: true } : { memberId: who })
		);
		return { confirmed: entryId };
	}
};
