import type Database from 'better-sqlite3';
import { accessRules, InvalidInputError, NotFoundError, type Actor } from './access';
import type { calendarModule, Team } from './calendar';
import type { Clock } from './ports';

import type { MatchAnswer } from '#lib/answers.js';

export { isMatchAnswer, MATCH_ANSWERS, type MatchAnswer } from '#lib/answers.js';

/** A member listed under a match's answers (or as not having answered). */
export type ResponseListMember = {
	id: string;
	name: string;
	team: Team | null;
	/** Not on the match's team: a possible substitute. */
	fromOtherTeam: boolean;
};

export type MatchResponses = Record<MatchAnswer, ResponseListMember[]> & {
	/** Active members of the match's team who haven't answered. */
	unanswered: ResponseListMember[];
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
			if (match.isPast) throw new InvalidInputError('matchPast');
			db.prepare(
				`INSERT INTO match_responses (match_id, member_id, answer, answered_at) VALUES (?, ?, ?, ?)
				 ON CONFLICT (match_id, member_id) DO UPDATE SET answer = excluded.answer, answered_at = excluded.answered_at`
			).run(matchId, me.id, answer, clock.now().toISOString());
		},

		/** All of a member's answers, by match id (for "my events"). */
		answersOf(memberId: string): Map<string, MatchAnswer> {
			const rows = db.prepare('SELECT match_id, answer FROM match_responses WHERE member_id = ?').all(memberId) as {
				match_id: string;
				answer: MatchAnswer;
			}[];
			return new Map(rows.map((r) => [r.match_id, r.answer]));
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
					fromOtherTeam: r.team_id !== match.team.id
				};
				result[r.answer ?? 'unanswered'].push(member);
			}
			return result;
		}
	};
}
