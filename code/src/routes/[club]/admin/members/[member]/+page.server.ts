import { error, redirect } from '@sveltejs/kit';
import { publicOrigin } from '#lib/server/app.js';
import { clubRequest, guarded, guardedForm } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const req = clubRequest(event);
	return guarded(req, () => {
		const all = [
			...req.core.listMembers(req.actor, req.club.id).map((m) => ({ ...m, active: true })),
			...req.core.listInactiveMembers(req.actor, req.club.id).map((m) => ({ ...m, active: false }))
		];
		const member = all.find((m) => m.id === event.params.member);
		if (!member) error(404);
		const lang = event.url.searchParams.get('lang') === 'en' ? 'en' : 'cs';
		return {
			member,
			messageLang: lang,
			link: member.active
				? req.core.personalLinkMessage(req.actor, req.club.id, member.id, { origin: publicOrigin(event.url), locale: lang })
				: null,
			added: event.url.searchParams.has('added')
		};
	});
};

export const actions: Actions = {
	update: async (event) => {
		const req = clubRequest(event);
		const form = await event.request.formData();
		const input = { name: String(form.get('name') ?? ''), email: String(form.get('email') ?? '') };
		return guardedForm(req, () => {
			req.core.updateMember(req.actor, req.club.id, event.params.member, input);
			return { saved: true };
		});
	},
	regenerate: (event) => {
		const req = clubRequest(event);
		guarded(req, () => req.core.regeneratePersonalLink(req.actor, req.club.id, event.params.member));
		return { regenerated: true };
	},
	deactivate: (event) => {
		const req = clubRequest(event);
		const result = guardedForm(req, () => req.core.deactivateMember(req.actor, req.club.id, event.params.member));
		if (result) return result;
		redirect(303, `/${req.club.slug}/admin/members`);
	}
};
