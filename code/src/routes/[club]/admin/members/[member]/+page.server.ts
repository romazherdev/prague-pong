import { redirect } from '@sveltejs/kit';
import { defaultLocale, isLocale } from '#lib/i18n/locales.js';
import { publicOrigin } from '#lib/server/app.js';
import { clubRequest, guarded, guardedForm } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const req = clubRequest(event);
	return guarded(req, () => {
		const member = req.core.getMember(req.actor, req.club.id, event.params.member);
		const asked = event.url.searchParams.get('lang');
		const lang = isLocale(asked) ? asked : defaultLocale;
		return {
			member,
			teams: req.core.listTeams(req.club.id),
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
	setTeam: async (event) => {
		const req = clubRequest(event);
		const teamId = String((await event.request.formData()).get('teamId') ?? '') || null;
		guarded(req, () => req.core.setMemberTeam(req.actor, req.club.id, event.params.member, teamId));
		return { teamSaved: true };
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
