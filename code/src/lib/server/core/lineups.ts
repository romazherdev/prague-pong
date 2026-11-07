import type Database from 'better-sqlite3';
import type { MatchAnswer } from '#lib/answers.js';
import { accessRules, ForbiddenError, InvalidInputError, NotFoundError, type Actor } from './access';
import type { CalendarMatch, calendarModule, MatchDetail, Team } from './calendar';
import type { responsesModule } from './responses';

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

export type CaptainMatch = CalendarMatch & { lineupSize: number };

/** Order for the captain: yes, maybe, not answered, no. */
const ANSWER_ORDER = { yes: 0, maybe: 1, none: 2, no: 3 } as const;
const answerRank = (a: MatchAnswer | null) => ANSWER_ORDER[a ?? 'none'];
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'cs');

export function lineupsModule(deps: {
	db: Database.Database;
	calendar: ReturnType<typeof calendarModule>;
	responses: ReturnType<typeof responsesModule>;
}) {
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

	const warningsOf = (lineup: LineupCandidate[]): LineupWarning[] =>
		lineup
			.filter((p) => p.answer !== 'yes')
			.map((p) => ({ memberId: p.id, name: p.name, answer: p.answer as LineupWarning['answer'] }));

	return {
		/** What the captain needs to pick a line-up. The match team's captain or an admin, signed in. */
		lineupView(actor: Actor | undefined, clubId: string, matchId: string): LineupView & { warnings: LineupWarning[] } {
			const match = managedMatch(actor, clubId, matchId);
			const candidates = candidatesFor(clubId, match);
			const lineup = candidates.filter((c) => c.inLineup).sort(byName);
			return { match, lineup, candidates, warnings: warningsOf(lineup) };
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
			const lineup = candidatesFor(clubId, match).filter((c) => c.inLineup).sort(byName);
			return { warnings: warningsOf(lineup) };
		},

		/** Upcoming matches of the teams the signed-in member captains (every team for an admin). */
		captainMatches(actor: Actor | undefined, clubId: string): CaptainMatch[] {
			const me = rules.requireMember(actor, clubId);
			const isAdmin = rules.isAdmin(actor, clubId);
			const captainOf = new Set(
				actor?.via === 'session'
					? (db.prepare('SELECT id FROM teams WHERE captain_member_id = ? AND club_id = ?').all(me.id, clubId) as { id: string }[]).map(
							(t) => t.id
						)
					: []
			);
			if (!isAdmin && captainOf.size === 0) throw new ForbiddenError('Captains and admins only');
			const sizes = new Map(
				(
					db
						.prepare('SELECT l.match_id, count(*) AS n FROM lineup_players l JOIN matches m ON m.id = l.match_id WHERE m.club_id = ? GROUP BY l.match_id')
						.all(clubId) as { match_id: string; n: number }[]
				).map((r) => [r.match_id, r.n])
			);
			return calendar
				.listMatches(clubId)
				.filter((m) => isAdmin || captainOf.has(m.team.id))
				.map((m) => ({ ...m, lineupSize: sizes.get(m.id) ?? 0 }));
		},

		/** The match's line-up as any member sees it: names and teams, by name. */
		matchLineup(actor: Actor | undefined, clubId: string, matchId: string): { id: string; name: string; fromOtherTeam: boolean }[] {
			rules.requireMember(actor, clubId);
			const match = calendar.getMatch(clubId, matchId);
			if (!match) throw new NotFoundError('No such match in this club');
			return candidatesFor(clubId, match)
				.filter((c) => c.inLineup)
				.sort(byName)
				.map((c) => ({ id: c.id, name: c.name, fromOtherTeam: c.fromOtherTeam }));
		},

		/** Ids of the matches the member is in the line-up for. */
		lineupMatchIdsOf(memberId: string): Set<string> {
			const rows = db.prepare('SELECT match_id FROM lineup_players WHERE member_id = ?').all(memberId) as { match_id: string }[];
			return new Set(rows.map((r) => r.match_id));
		}
	};
}
