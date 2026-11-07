import { error } from '@sveltejs/kit';
import { translator } from '#lib/i18n/messages.js';
import { answerAction, answeringActor, clubRequest } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const req = clubRequest(event);
	const { core, club } = req;
	const match = core.getMatch(club.id, event.params.match);
	if (!match) error(404, translator(event.locals.locale)('match.notFound'));
	// Members (personal link or signed in) see the answers and can answer; anonymous visitors see the match only.
	const who = answeringActor(req);
	const responses = who ? core.matchResponses(who, club.id, match.id) : null;
	const myAnswer = who ? core.myAnswer(who, club.id, match.id) : null;
	const lineup = who ? core.matchLineup(who, club.id, match.id) : [];
	// The link to the line-up page shows for the team's captain and admins (signed in).
	const canManageLineup = !!req.signedIn && (req.signedIn.isAdmin || req.signedIn.captainOf.some((t) => t.id === match.team.id));
	return { match, responses, myAnswer, lineup, canManageLineup, canAnswer: !!who && !match.isPast };
};

export const actions: Actions = { answer: answerAction };
