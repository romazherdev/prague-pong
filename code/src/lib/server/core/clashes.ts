import type { CalendarMatch, calendarModule, MatchFilter } from './calendar';
import type { lineupsModule } from './lineups';
import type { settingsModule } from './settings';
import { localDate } from './time';

/** A problem on one evening (the club's local date). `matchIds` are the matches involved, soonest first. */
export type EveningClash =
	| {
			kind: 'tooFewTables';
			date: string;
			matchIds: string[];
			homeMatches: number;
			tablesNeeded: number;
			totalTables: number;
	  }
	| { kind: 'doubleBooked'; date: string; matchIds: string[]; member: { id: string; name: string } };

export type ClubCalendar = { matches: CalendarMatch[]; clashes: EveningClash[] };

/** Evening-by-evening checks across all of the club's teams. */
export function clashesModule(deps: {
	calendar: ReturnType<typeof calendarModule>;
	lineups: ReturnType<typeof lineupsModule>;
	settings: ReturnType<typeof settingsModule>;
}) {
	const { calendar, lineups, settings } = deps;

	function clashesAmong(clubId: string, matches: CalendarMatch[]): EveningClash[] {
		const timeZone = calendar.findClubById(clubId)?.timeZone;
		if (!timeZone) return [];
		const { totalTables, tablesPerHomeMatch } = settings.clubSettings(clubId);
		const lineupOf = lineups.activeLineupsByMatch(clubId);
		const evenings = Map.groupBy(matches, (m) => localDate(new Date(m.startsAt), timeZone));
		const clashes: EveningClash[] = [];

		for (const [date, evening] of evenings) {
			const home = evening.filter((m) => m.isHome);
			if (home.length * tablesPerHomeMatch > totalTables) {
				clashes.push({
					kind: 'tooFewTables',
					date,
					matchIds: home.map((m) => m.id),
					homeMatches: home.length,
					tablesNeeded: home.length * tablesPerHomeMatch,
					totalTables
				});
			}
			const lineupsOfMember = new Map<string, { name: string; matchIds: string[] }>();
			for (const m of evening) {
				for (const p of lineupOf.get(m.id) ?? []) {
					const entry = lineupsOfMember.get(p.id) ?? { name: p.name, matchIds: [] };
					entry.matchIds.push(m.id);
					lineupsOfMember.set(p.id, entry);
				}
			}
			for (const [id, { name, matchIds }] of lineupsOfMember) {
				if (matchIds.length > 1) clashes.push({ kind: 'doubleBooked', date, matchIds, member: { id, name } });
			}
		}
		return clashes;
	}

	return {
		/**
		 * The club calendar with clash flags per evening. Clashes are checked across all teams, even when the
		 * calendar is narrowed to one team, and for the same evenings the calendar shows.
		 */
		clubCalendar(clubId: string, filter: MatchFilter = {}): ClubCalendar {
			const all = calendar.listMatches(clubId, { includePast: filter.includePast });
			const matches = filter.teamId ? all.filter((m) => m.team.id === filter.teamId) : all;
			const shown = new Set(matches.map((m) => m.id));
			const clashes = clashesAmong(clubId, all).filter((c) => c.matchIds.some((id) => shown.has(id)));
			return { matches, clashes };
		},

		/** The clashes on the evening of one match that involve it. */
		clashesForMatch(clubId: string, matchId: string): EveningClash[] {
			const match = calendar.getMatch(clubId, matchId);
			if (!match) return [];
			const all = calendar.listMatches(clubId, { includePast: true });
			return clashesAmong(clubId, all).filter((c) => c.matchIds.includes(matchId));
		}
	};
}
