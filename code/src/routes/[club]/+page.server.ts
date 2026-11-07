import { error } from '@sveltejs/kit';
import { translator } from '#lib/i18n/messages.js';
import { appCore } from '#lib/server/app.js';
import type { PageServerLoad } from './$types';

/** `?team=B` filters to one team (by name, so links stay readable); `?past=1` also shows past matches. */
export const load: PageServerLoad = ({ params, locals, url }) => {
	const core = appCore();
	const club = core.findClubBySlug(params.club);
	if (!club) error(404, translator(locals.locale)('club.notFound'));

	const teams = core.listTeams(club.id);
	const team = teams.find((t) => t.name === url.searchParams.get('team'));
	const includePast = url.searchParams.get('past') === '1';

	return {
		club,
		teams,
		selectedTeam: team?.name ?? null,
		includePast,
		matches: core.listMatches(club.id, { teamId: team?.id, includePast })
	};
};
