import { error } from '@sveltejs/kit';
import { translator } from '#lib/i18n/messages.js';
import { appCore } from '#lib/server/app.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const core = appCore();
	const club = core.findClubBySlug(params.club);
	if (!club) error(404, translator(locals.locale)('club.notFound'));
	return { club, matches: core.listUpcomingMatches(club.id) };
};
