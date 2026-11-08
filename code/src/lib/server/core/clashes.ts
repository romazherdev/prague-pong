import type Database from 'better-sqlite3';
import { accessRules, type Actor } from './access';
import { DEFAULT_TIME_ZONE, type CalendarMatch, type calendarModule, type MatchFilter } from './calendar';
import type { lineupsModule } from './lineups';
import type { settingsModule } from './settings';
import type { TrainingSession, trainingModule } from './training';
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
	| { kind: 'doubleBooked'; date: string; matchIds: string[]; member: { id: string; name: string } }
	| {
			/** Home matches leave a training session fewer free tables than the club's minimum. */
			kind: 'trainingTables';
			date: string;
			matchIds: string[];
			sessionId: string;
			freeTables: number;
			minTrainingTables: number;
	  };

/** A calendar match with its evening (the club's local date, which clashes are grouped by). */
export type EveningMatch = CalendarMatch & {
	evening: string;
	/** Line-up players who dropped out: the captain has a spot to fill. */
	spotsOpen: number;
};

/** The club calendar: matches and training sessions, each with its evening, and the clashes. */
export type ClubCalendar = { matches: EveningMatch[]; trainings: (TrainingSession & { evening: string })[]; clashes: EveningClash[] };

/** Evening-by-evening checks across all of the club's teams. */
export function clashesModule(deps: {
	db: Database.Database;
	calendar: ReturnType<typeof calendarModule>;
	lineups: ReturnType<typeof lineupsModule>;
	settings: ReturnType<typeof settingsModule>;
	training: ReturnType<typeof trainingModule>;
}) {
	const { calendar, lineups, settings, training } = deps;
	const rules = accessRules(deps.db);

	function clashesAmong(clubId: string, matches: CalendarMatch[], trainings: TrainingSession[] = []): EveningClash[] {
		const timeZone = calendar.findClubById(clubId)?.timeZone;
		if (!timeZone) return [];
		const { totalTables, tablesPerHomeMatch, minTrainingTables } = settings.clubSettings(clubId);
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
		for (const session of trainings.filter((s) => s.belowMinTables)) {
			clashes.push({
				kind: 'trainingTables',
				date: session.date,
				matchIds: session.homeMatchIds,
				sessionId: session.id,
				freeTables: session.freeTables,
				minTrainingTables
			});
		}
		return clashes.sort((a, b) => a.date.localeCompare(b.date));
	}

	return {
		/**
		 * The club calendar with clash flags per evening. Clashes are checked across all teams, even when the
		 * calendar is narrowed to one team, and for the same evenings the calendar shows. Double bookings are
		 * only included when `viewer` is a member of the club.
		 */
		clubCalendar(clubId: string, filter: MatchFilter = {}, viewer?: Actor): ClubCalendar {
			const all = calendar.listMatches(clubId, { includePast: filter.includePast });
			const timeZone = calendar.findClubById(clubId)?.timeZone ?? DEFAULT_TIME_ZONE;
			const spotsOpen = lineups.spotsOpenByMatch(clubId);
			const matches = (filter.teamId ? all.filter((m) => m.team.id === filter.teamId) : all).map((m) => ({
				...m,
				evening: localDate(new Date(m.startsAt), timeZone),
				spotsOpen: spotsOpen.get(m.id) ?? 0
			}));
			const shown = new Set(matches.map((m) => m.id));
			const trainings = training.listTrainingSessions(clubId, { includePast: filter.includePast }).map((s) => ({ ...s, evening: s.date }));
			// A double booking names a member, so only members see it; the calendar itself is public.
			const isMember = !!viewer && rules.isActiveMemberOf(viewer.memberId, clubId);
			const clashes = clashesAmong(clubId, all, trainings).filter(
				(c) => (c.kind === 'trainingTables' || c.matchIds.some((id) => shown.has(id))) && (isMember || c.kind !== 'doubleBooked')
			);
			return { matches, trainings, clashes };
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
