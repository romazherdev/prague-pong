import { fail, redirect } from '@sveltejs/kit';
import { clubRequest, guarded, guardedForm } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const req = clubRequest(event);
	return guarded(req, () => ({
		members: req.core.listMembers(req.actor, req.club.id),
		inactive: req.core.listInactiveMembers(req.actor, req.club.id)
	}));
};

export const actions: Actions = {
	add: async (event) => {
		const req = clubRequest(event);
		const form = await event.request.formData();
		const name = String(form.get('name') ?? '');
		const email = String(form.get('email') ?? '');
		const result = guardedForm(req, () => req.core.addMember(req.actor, req.club.id, { name, email }));
		if ('status' in result) return fail(result.status, { ...result.data, name, email });
		redirect(303, `/${req.club.slug}/admin/members/${result.id}?added=1`);
	},
	reactivate: async (event) => {
		const req = clubRequest(event);
		const memberId = String((await event.request.formData()).get('memberId') ?? '');
		guarded(req, () => req.core.reactivateMember(req.actor, req.club.id, memberId));
	}
};
