import { clubRequest } from '#lib/server/request.js';
import type { PageServerLoad } from './$types';

/** `?team=B` filters to one team (by name, so links stay readable); `?past=1` also shows past matches. */
export const load: PageServerLoad = (event) => {
	const { core, club } = clubRequest(event);
	const teams = core.listTeams(club.id);
	const team = teams.find((t) => t.name === event.url.searchParams.get('team'));
	const includePast = event.url.searchParams.get('past') === '1';

	return {
		teams,
		selectedTeam: team?.name ?? null,
		includePast,
		...core.clubCalendar(club.id, { teamId: team?.id, includePast })
	};
};
