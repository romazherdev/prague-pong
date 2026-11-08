import { answerAction, clubRequest, trainingAnswerAction } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const { core, club, member } = clubRequest(event);
	if (!member) return { events: null };
	return { events: core.myUpcomingEvents(member.actor, club.id) };
};

export const actions: Actions = { answer: answerAction, training: trainingAnswerAction };
