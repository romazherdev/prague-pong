import { error } from '@sveltejs/kit';
import { translator } from '#lib/i18n/messages.js';
import { publicOrigin } from '#lib/server/app.js';
import { answerAction, answeringActor, clubRequest, guardedForm, matchMessages } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const req = clubRequest(event);
	const { core, club } = req;
	const match = core.getMatch(club.id, event.params.match);
	if (!match) error(404, translator(event.locals.locale)('match.notFound'));
	// Members (personal link or signed in) see the answers and can answer; anonymous visitors see the match only.
	const who = answeringActor(req);
	const responses = who ? core.matchResponses(who, club.id, match.id) : null;
	const myResponse = who ? core.myResponse(who, club.id, match.id) : null;
	const lineup = who ? core.matchLineup(who, club.id, match.id) : [];
	const canCaptain = core.canCaptainMatch(req.actor, club.id, match.id);
	return {
		match,
		responses,
		myResponse,
		lineup,
		canCaptain,
		whatsapp: canCaptain ? matchMessages(req, match.id, publicOrigin(event.url)) : null,
		canAnswer: !!who && !match.isPast
	};
};

export const actions: Actions = {
	answer: answerAction,
	reschedule: async (event) => {
		const req = clubRequest(event);
		const startsLocal = String((await event.request.formData()).get('startsLocal') ?? '');
		return guardedForm(req, () => {
			req.core.rescheduleMatch(req.actor, req.club.id, event.params.match, { startsLocal });
			return { rescheduled: true };
		});
	}
};
