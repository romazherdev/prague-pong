import { error } from '@sveltejs/kit';
import { translator } from '#lib/i18n/messages.js';
import { clubRequest } from '#lib/server/request.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const { core, club } = clubRequest(event);
	const match = core.getMatch(club.id, event.params.match);
	if (!match) error(404, translator(event.locals.locale)('match.notFound'));
	return { match };
};
