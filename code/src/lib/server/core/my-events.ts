import type Database from 'better-sqlite3';
import { accessRules, type Actor } from './access';
import type { CalendarMatch, calendarModule, Team } from './calendar';
import type { lineupsModule } from './lineups';
import type { TrainingAnswer, TrainingSession, trainingModule } from './training';
import type { MatchAnswer, responsesModule } from './responses';

export type MyMatch = CalendarMatch & {
	/** The member's own team plays it. */
	isMyTeam: boolean;
	/** The member's answer, or null if they haven't answered. */
	myAnswer: MatchAnswer | null;
	/** The match was moved after they said yes or maybe: they should answer again. */
	needsReconfirm: boolean;
	/** The captain put the member in the line-up. */
	inLineup: boolean;
};

export type MyEvents = {
	name: string;
	team: Team | null;
	/** Upcoming matches of the whole club, soonest first. */
	matches: MyMatch[];
	/** How many of their own team's upcoming matches they haven't answered. */
	unansweredMyTeam: number;
	/** How many moved matches (any team) they should answer again. */
	toReconfirm: number;
	/** Upcoming training sessions (cancelled ones included, marked) with the member's in/out. */
	trainings: (TrainingSession & { myAnswer: TrainingAnswer | null })[];
};

/** What a member sees when they open their personal link. */
export function myEventsModule(deps: {
	db: Database.Database;
	calendar: ReturnType<typeof calendarModule>;
	responses: ReturnType<typeof responsesModule>;
	lineups: ReturnType<typeof lineupsModule>;
	training: ReturnType<typeof trainingModule>;
}) {
	const { db, calendar, responses, lineups, training } = deps;
	const rules = accessRules(db);

	return {
		myUpcomingEvents(actor: Actor | undefined, clubId: string): MyEvents {
			const me = rules.requireMember(actor, clubId);
			const team = db
				.prepare('SELECT t.id, t.name FROM members m JOIN teams t ON t.id = m.team_id WHERE m.id = ?')
				.get(me.id) as Team | undefined;
			const answers = responses.answersOf(me.id);
			const inLineup = lineups.lineupMatchIdsOf(me.id);
			const matches = calendar.listMatches(clubId).map((m) => ({
				...m,
				isMyTeam: m.team.id === team?.id,
				myAnswer: answers.get(m.id)?.answer ?? null,
				needsReconfirm: answers.get(m.id)?.needsReconfirm ?? false,
				inLineup: inLineup.has(m.id)
			}));
			return {
				name: me.name,
				team: team ?? null,
				matches,
				unansweredMyTeam: matches.filter((m) => m.isMyTeam && !m.myAnswer).length,
				toReconfirm: matches.filter((m) => m.needsReconfirm).length,
				trainings: training.myTrainingSessions(actor, clubId)
			};
		}
	};
}
