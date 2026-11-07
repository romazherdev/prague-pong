import type Database from 'better-sqlite3';
import { accessRules, type Actor } from './access';
import type { CalendarMatch, calendarModule, Team } from './calendar';
import type { MatchAnswer, responsesModule } from './responses';

export type MyMatch = CalendarMatch & {
	/** The member's own team plays it. */
	isMyTeam: boolean;
	/** The member's answer, or null if they haven't answered. */
	myAnswer: MatchAnswer | null;
};

export type MyEvents = {
	name: string;
	team: Team | null;
	/** Upcoming matches of the whole club, soonest first. */
	matches: MyMatch[];
	/** How many of their own team's upcoming matches they haven't answered. */
	unansweredMyTeam: number;
};

/** What a member sees when they open their personal link. */
export function myEventsModule(deps: {
	db: Database.Database;
	calendar: ReturnType<typeof calendarModule>;
	responses: ReturnType<typeof responsesModule>;
}) {
	const { db, calendar, responses } = deps;
	const rules = accessRules(db);

	return {
		myUpcomingEvents(actor: Actor | undefined, clubId: string): MyEvents {
			const me = rules.requireMember(actor, clubId);
			const team = db
				.prepare('SELECT t.id, t.name FROM members m JOIN teams t ON t.id = m.team_id WHERE m.id = ?')
				.get(me.id) as Team | undefined;
			const answers = responses.answersOf(me.id);
			const matches = calendar.listMatches(clubId).map((m) => ({
				...m,
				isMyTeam: m.team.id === team?.id,
				myAnswer: answers.get(m.id) ?? null
			}));
			return {
				name: me.name,
				team: team ?? null,
				matches,
				unansweredMyTeam: matches.filter((m) => m.isMyTeam && !m.myAnswer).length
			};
		}
	};
}
