import type Database from 'better-sqlite3';
import type { MatchAnswer } from '#lib/answers.js';
import { accessRules, ForbiddenError, InvalidInputError, NotFoundError, type Actor } from './access';
import type { CalendarMatch, calendarModule, MatchDetail, Team } from './calendar';

export const LINEUP_SIZE = 4;

/** A member as the captain sees them when building a line-up. */
export type LineupCandidate = {
	id: string;
	name: string;
	team: Team | null;
	/** Not on the match's team: a substitute if picked. */
	fromOtherTeam: boolean;
	answer: MatchAnswer | null;
	inLineup: boolean;
};

export type LineupView = {
	match: MatchDetail;
	/** The picked players, by name. */
	lineup: LineupCandidate[];
	/** Every active member: the match's team first, then by answer (yes, maybe, none, no), then name. */
	candidates: LineupCandidate[];
};

/** A picked player whose answer isn't "yes": the captain should check. */
export type LineupWarning = { memberId: string; name: string; answer: Exclude<MatchAnswer, 'yes'> | null };

export type CaptainMatch = CalendarMatch & {
	lineupSize: number;
	lineupMax: number;
	/** How many active members answered each way. */
	answers: Record<MatchAnswer, number>;
};

/** Order for the captain: yes, maybe, not answered, no. */
const ANSWER_ORDER = { yes: 0, maybe: 1, none: 2, no: 3 } as const;
const answerRank = (a: MatchAnswer | null) => ANSWER_ORDER[a ?? 'none'];
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'cs');

export function lineupsModule(deps: { db: Database.Database; calendar: ReturnType<typeof calendarModule> }) {
	const { db, calendar } = deps;
	const rules = accessRules(db);

	/** The match, if the actor may manage its line-up (its team's captain or an admin). */
	function managedMatch(actor: Actor | undefined, clubId: string, matchId: string): MatchDetail {
		const match = calendar.getMatch(clubId, matchId);
		if (!match) {
			rules.requireMember(actor, clubId);
			throw new NotFoundError('No such match in this club');
		}
		rules.requireCaptainOf(actor, clubId, match.team.id);
		return match;
	}

	function candidatesFor(clubId: string, match: MatchDetail): LineupCandidate[] {
		const rows = db
			.prepare(
				`SELECT m.id, m.name, t.id AS team_id, t.name AS team_name, r.answer, (l.member_id IS NOT NULL) AS in_lineup
				 FROM members m
				 LEFT JOIN teams t ON t.id = m.team_id
				 LEFT JOIN match_responses r ON r.member_id = m.id AND r.match_id = @matchId
				 LEFT JOIN lineup_players l ON l.member_id = m.id AND l.match_id = @matchId
				 WHERE m.club_id = @clubId AND m.active = 1`
			)
			.all({ clubId, matchId: match.id }) as {
			id: string;
			name: string;
			team_id: string | null;
			team_name: string | null;
			answer: MatchAnswer | null;
			in_lineup: number;
		}[];
		return rows
			.map((r) => ({
				id: r.id,
				name: r.name,
				team: r.team_id ? { id: r.team_id, name: r.team_name! } : null,
				fromOtherTeam: r.team_id !== match.team.id,
				answer: r.answer,
				inLineup: r.in_lineup === 1
			}))
			.sort((a, b) => Number(a.fromOtherTeam) - Number(b.fromOtherTeam) || answerRank(a.answer) - answerRank(b.answer) || byName(a, b));
	}

	const lineupOf = (clubId: string, match: MatchDetail) => candidatesFor(clubId, match).filter((c) => c.inLineup).sort(byName);

	const warningsOf = (lineup: LineupCandidate[]): LineupWarning[] =>
		lineup
			.filter((p) => p.answer !== 'yes')
			.map((p) => ({ memberId: p.id, name: p.name, answer: p.answer as LineupWarning['answer'] }));

	return {
		/** What the captain needs to pick a line-up. The match team's captain or an admin, signed in. */
		lineupView(actor: Actor | undefined, clubId: string, matchId: string): LineupView & { warnings: LineupWarning[]; maxSize: number } {
			const match = managedMatch(actor, clubId, matchId);
			const candidates = candidatesFor(clubId, match);
			const lineup = lineupOf(clubId, match);
			return { match, lineup, candidates, warnings: warningsOf(lineup), maxSize: LINEUP_SIZE };
		},

		/**
		 * Sets the match's line-up: up to 4 different active members of the club, from any team, in no order.
		 * Players who didn't answer "yes" are allowed but come back as warnings. League rules aren't checked.
		 */
		setLineup(actor: Actor | undefined, clubId: string, matchId: string, memberIds: string[]): { warnings: LineupWarning[] } {
			const match = managedMatch(actor, clubId, matchId);
			if (match.isPast) throw new InvalidInputError('matchPast');
			if (memberIds.length > LINEUP_SIZE) throw new InvalidInputError('lineupTooBig');
			if (new Set(memberIds).size !== memberIds.length) throw new InvalidInputError('lineupDuplicate');
			for (const id of memberIds) {
				if (!rules.isActiveMemberOf(id, clubId)) throw new NotFoundError('No such active member in this club');
			}
			db.transaction(() => {
				db.prepare('DELETE FROM lineup_players WHERE match_id = ?').run(matchId);
				const insert = db.prepare('INSERT INTO lineup_players (match_id, member_id) VALUES (?, ?)');
				for (const id of memberIds) insert.run(matchId, id);
			})();
			return { warnings: warningsOf(lineupOf(clubId, match)) };
		},

		/** Upcoming matches of the teams the signed-in member captains (every team for an admin). */
		captainMatches(actor: Actor | undefined, clubId: string): CaptainMatch[] {
			const me = rules.requireMember(actor, clubId);
			const isAdmin = rules.isAdmin(actor, clubId);
			const captainOf = actor?.via === 'session' ? rules.teamIdsCaptainedBy(me.id, clubId) : new Set<string>();
			if (!isAdmin && captainOf.size === 0) throw new ForbiddenError('Captains and admins only');
			const sizes = new Map(
				(
					db
						.prepare(
							`SELECT l.match_id, count(*) AS n FROM lineup_players l
							 JOIN matches m ON m.id = l.match_id JOIN members p ON p.id = l.member_id
							 WHERE m.club_id = ? AND p.active = 1 GROUP BY l.match_id`
						)
						.all(clubId) as { match_id: string; n: number }[]
				).map((r) => [r.match_id, r.n])
			);
			const answers = new Map<string, Record<MatchAnswer, number>>();
			for (const r of db
				.prepare(
					`SELECT r.match_id, r.answer, count(*) AS n FROM match_responses r
					 JOIN members p ON p.id = r.member_id JOIN matches m ON m.id = r.match_id
					 WHERE m.club_id = ? AND p.active = 1 GROUP BY r.match_id, r.answer`
				)
				.all(clubId) as { match_id: string; answer: MatchAnswer; n: number }[]) {
				const counts = answers.get(r.match_id) ?? { yes: 0, maybe: 0, no: 0 };
				counts[r.answer] = r.n;
				answers.set(r.match_id, counts);
			}
			return calendar
				.listMatches(clubId)
				.filter((m) => isAdmin || captainOf.has(m.team.id))
				.map((m) => ({
					...m,
					lineupSize: sizes.get(m.id) ?? 0,
					lineupMax: LINEUP_SIZE,
					answers: answers.get(m.id) ?? { yes: 0, maybe: 0, no: 0 }
				}));
		},

		/** Whether the actor may change the match's line-up (its team's captain or an admin, signed in). */
		canManageLineup(actor: Actor | undefined, clubId: string, matchId: string): boolean {
			const match = calendar.getMatch(clubId, matchId);
			return !!match && rules.canCaptain(actor, clubId, match.team.id);
		},

		/** The match's line-up as any member sees it: names and teams, by name. */
		matchLineup(actor: Actor | undefined, clubId: string, matchId: string): { id: string; name: string; fromOtherTeam: boolean }[] {
			rules.requireMember(actor, clubId);
			const match = calendar.getMatch(clubId, matchId);
			if (!match) throw new NotFoundError('No such match in this club');
			return lineupOf(clubId, match).map((c) => ({ id: c.id, name: c.name, fromOtherTeam: c.fromOtherTeam }));
		},

		/** Ids of the matches the member is in the line-up for. */
		lineupMatchIdsOf(memberId: string): Set<string> {
			const rows = db.prepare('SELECT match_id FROM lineup_players WHERE member_id = ?').all(memberId) as { match_id: string }[];
			return new Set(rows.map((r) => r.match_id));
		}
	};
}
