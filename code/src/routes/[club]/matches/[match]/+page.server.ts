import { error } from '@sveltejs/kit';
import { translator } from '#lib/i18n/messages.js';
import { answerAction, clubRequest } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const { core, club, member, actor } = clubRequest(event);
	const match = core.getMatch(club.id, event.params.match);
	if (!match) error(404, translator(event.locals.locale)('match.notFound'));
	// Members (personal link or signed in) see the answers and can answer; anonymous visitors see the match only.
	const who = member?.actor ?? actor;
	const responses = who ? core.matchResponses(who, club.id, match.id) : null;
	const myAnswer = who ? core.myAnswer(who, club.id, match.id) : null;
	return { match, responses, myAnswer, canAnswer: !!who && !core.isPast(club.id, match.startsAt) };
};

export const actions: Actions = { answer: answerAction };
