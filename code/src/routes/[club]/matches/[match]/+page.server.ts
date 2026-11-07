import { error } from '@sveltejs/kit';
import { translator } from '#lib/i18n/messages.js';
import { appCore } from '#lib/server/app.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const t = translator(locals.locale);
	const core = appCore();
	const club = core.findClubBySlug(params.club);
	if (!club) error(404, t('club.notFound'));
	const match = core.getMatch(club.id, params.match);
	if (!match) error(404, t('match.notFound'));
	return { club, match };
};
