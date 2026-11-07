import type Database from 'better-sqlite3';
import { accessRules, InvalidInputError, NotFoundError, type Actor } from './access';
import type { calendarModule, Team } from './calendar';
import type { Clock } from './ports';

export const MATCH_ANSWERS = ['yes', 'maybe', 'no'] as const;
export type MatchAnswer = (typeof MATCH_ANSWERS)[number];
export const isMatchAnswer = (v: unknown): v is MatchAnswer => (MATCH_ANSWERS as readonly unknown[]).includes(v);

/** A member as listed under a match's answers. A substitute is from another team than the match's. */
export type RespondingMember = { id: string; name: string; team: Team | null; isSubstitute: boolean };

export type MatchResponses = Record<MatchAnswer, RespondingMember[]> & {
	/** Active members of the match's team who haven't answered. */
	unanswered: RespondingMember[];
};

export function responsesModule(deps: { db: Database.Database; clock: Clock; calendar: ReturnType<typeof calendarModule> }) {
	const { db, clock, calendar } = deps;
	const rules = accessRules(db);

	return {
		/** A member's answer to a match of any team; answering again replaces it. Upcoming matches only. */
		recordResponse(actor: Actor | undefined, clubId: string, matchId: string, answer: MatchAnswer): void {
			const me = rules.requireMember(actor, clubId);
			const match = calendar.getMatch(clubId, matchId);
			if (!match) throw new NotFoundError('No such match in this club');
			if (calendar.isPast(clubId, match.startsAt)) throw new InvalidInputError('matchPast');
			db.prepare(
				`INSERT INTO match_responses (match_id, member_id, answer, answered_at) VALUES (?, ?, ?, ?)
				 ON CONFLICT (match_id, member_id) DO UPDATE SET answer = excluded.answer, answered_at = excluded.answered_at`
			).run(matchId, me.id, answer, clock.now().toISOString());
		},

		/** The member's current answer to a match, or null. */
		myAnswer(actor: Actor | undefined, clubId: string, matchId: string): MatchAnswer | null {
			const me = rules.requireMember(actor, clubId);
			const row = db.prepare('SELECT answer FROM match_responses WHERE match_id = ? AND member_id = ?').get(matchId, me.id) as
				| { answer: MatchAnswer }
				| undefined;
			return row?.answer ?? null;
		},

		/** Who said yes, maybe or no to a match, and who on its team hasn't answered. Active members only. */
		matchResponses(actor: Actor | undefined, clubId: string, matchId: string): MatchResponses {
			rules.requireMember(actor, clubId);
			const match = calendar.getMatch(clubId, matchId);
			if (!match) throw new NotFoundError('No such match in this club');
			const rows = db
				.prepare(
					`SELECT m.id, m.name, t.id AS team_id, t.name AS team_name, r.answer
					 FROM members m
					 LEFT JOIN teams t ON t.id = m.team_id
					 LEFT JOIN match_responses r ON r.member_id = m.id AND r.match_id = ?
					 WHERE m.club_id = ? AND m.active = 1 AND (r.answer IS NOT NULL OR m.team_id = ?)`
				)
				.all(matchId, clubId, match.team.id) as {
				id: string;
				name: string;
				team_id: string | null;
				team_name: string | null;
				answer: MatchAnswer | null;
			}[];

			const result: MatchResponses = { yes: [], maybe: [], no: [], unanswered: [] };
			for (const r of rows.sort((a, b) => a.name.localeCompare(b.name, 'cs'))) {
				const member = {
					id: r.id,
					name: r.name,
					team: r.team_id ? { id: r.team_id, name: r.team_name! } : null,
					isSubstitute: r.team_id !== match.team.id
				};
				result[r.answer ?? 'unanswered'].push(member);
			}
			return result;
		}
	};
}
