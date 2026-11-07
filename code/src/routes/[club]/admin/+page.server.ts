import { fail } from '@sveltejs/kit';
import { clubRequest, guarded } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const req = clubRequest(event);
	return guarded(req, () => ({
		teams: req.core.listTeamsWithCaptains(req.actor, req.club.id),
		members: req.core.listMembers(req.actor, req.club.id)
	}));
};

export const actions: Actions = {
	setCaptain: async (event) => {
		const req = clubRequest(event);
		const form = await event.request.formData();
		const teamId = String(form.get('teamId') ?? '');
		const memberId = String(form.get('memberId') ?? '') || null;
		if (!teamId) return fail(400);
		guarded(req, () => req.core.setCaptain(req.actor, req.club.id, teamId, memberId));
		return { saved: teamId };
	}
};
