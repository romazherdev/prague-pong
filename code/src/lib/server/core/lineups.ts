import type Database from 'better-sqlite3';
import { effectiveAnswer, type MatchAnswer } from '#lib/answers.js';
import { accessRules, ForbiddenError, InvalidInputError, NotFoundError, type Actor } from './access';
import type { CalendarMatch, calendarModule, MatchDetail, Team } from './calendar';
import type { Clock } from './ports';

export const LINEUP_SIZE = 4;

/**
 * The one definition of a drop-out, as SQL over `l` (lineup_players) and `r` (match_responses): the player
 * answered "no" after being picked (not a "no" the captain already knew about, which is only a warning).
 */
const DROPPED_OUT_SQL = `(r.answer = 'no' AND r.needs_reconfirm = 0 AND r.answered_at > l.picked_at)`;

/** A member as the captain sees them when building a line-up. */
export type LineupCandidate = {
	id: string;
	name: string;
	team: Team | null;
	/** Not on the match's team: a substitute if picked. */
	fromOtherTeam: boolean;
	answer: MatchAnswer | null;
	/** The match was moved after they said yes or maybe; `answer` is their old answer. */
	needsReconfirm: boolean;
	inLineup: boolean;
	/** In the line-up and answered "no" since being picked: their spot is open. */
	droppedOut: boolean;
};

export type LineupView = {
	match: MatchDetail;
	/** The picked players, by name. */
	lineup: LineupCandidate[];
	/** Every active member: the match's team first, then by answer (yes, maybe, reconfirm, none, no), then name. */
	candidates: LineupCandidate[];
	/** The match was moved since the line-up was last saved or reviewed. */
	needsAttention: boolean;
	/** Line-up players who have since answered "no". They stay in the line-up until the captain acts. */
	spotsOpen: { id: string; name: string }[];
};

/** A picked player without a current "yes": the captain should check. */
export type LineupWarning = { memberId: string; name: string; answer: Exclude<MatchAnswer, 'yes'> | 'reconfirm' | null };

export type CaptainMatch = CalendarMatch & {
	/** The match was moved since the line-up was last saved or reviewed. */
	needsAttention: boolean;
	/** Line-up players who have since answered "no". */
	spotsOpen: number;
	lineupSize: number;
	lineupMax: number;
	/** How many active members answered each way; `reconfirm` counts old answers to confirm again. */
	answers: Record<MatchAnswer | 'reconfirm', number>;
};

/** Order for the captain: yes, maybe, to reconfirm, not answered, no. */
const ANSWER_ORDER = { yes: 0, maybe: 1, reconfirm: 2, none: 3, no: 4 } as const;
const answerRank = (c: Pick<LineupCandidate, 'answer' | 'needsReconfirm'>) =>
	ANSWER_ORDER[effectiveAnswer(c.answer, c.needsReconfirm) ?? 'none'];
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'cs');

export function lineupsModule(deps: { db: Database.Database; clock: Clock; calendar: ReturnType<typeof calendarModule> }) {
	const { db, clock, calendar } = deps;
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
				`SELECT m.id, m.name, t.id AS team_id, t.name AS team_name, r.answer, r.needs_reconfirm,
				        (l.member_id IS NOT NULL) AS in_lineup, coalesce(${DROPPED_OUT_SQL}, 0) AS dropped_out
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
			needs_reconfirm: number | null;
			in_lineup: number;
			dropped_out: number;
		}[];
		return rows
			.map((r) => ({
				id: r.id,
				name: r.name,
				team: r.team_id ? { id: r.team_id, name: r.team_name! } : null,
				fromOtherTeam: r.team_id !== match.team.id,
				answer: r.answer,
				needsReconfirm: r.needs_reconfirm === 1,
				inLineup: r.in_lineup === 1,
				droppedOut: r.in_lineup === 1 && r.dropped_out === 1
			}))
			.sort((a, b) => Number(a.fromOtherTeam) - Number(b.fromOtherTeam) || answerRank(a) - answerRank(b) || byName(a, b));
	}


	/** How many line-up players of each of the club's matches have dropped out (answered "no"). */
	function spotsOpenByMatch(clubId: string): Map<string, number> {
		const rows = db
			.prepare(
				`SELECT l.match_id, count(*) AS n FROM lineup_players l
				 JOIN matches m ON m.id = l.match_id JOIN members p ON p.id = l.member_id
				 JOIN match_responses r ON r.match_id = l.match_id AND r.member_id = l.member_id
				 WHERE m.club_id = ? AND p.active = 1 AND ${DROPPED_OUT_SQL}
				 GROUP BY l.match_id`
			)
			.all(clubId) as { match_id: string; n: number }[];
		return new Map(rows.map((r) => [r.match_id, r.n]));
	}

	const lineupNeedsAttention = (matchId: string) =>
		(db.prepare('SELECT lineup_needs_attention AS n FROM matches WHERE id = ?').get(matchId) as { n: number }).n === 1;

	const lineupOf = (clubId: string, match: MatchDetail) => candidatesFor(clubId, match).filter((c) => c.inLineup).sort(byName);

	const warningsOf = (lineup: LineupCandidate[]): LineupWarning[] =>
		lineup
			.filter((p) => p.answer !== 'yes' || p.needsReconfirm)
			.map((p) => ({
				memberId: p.id,
				name: p.name,
				answer: effectiveAnswer(p.answer, p.needsReconfirm) as LineupWarning['answer']
			}));

	return {
		/** What the captain needs to pick a line-up. The match team's captain or an admin, signed in. */
		lineupView(actor: Actor | undefined, clubId: string, matchId: string): LineupView & { warnings: LineupWarning[]; maxSize: number } {
			const match = managedMatch(actor, clubId, matchId);
			const candidates = candidatesFor(clubId, match);
			const lineup = lineupOf(clubId, match);
			return {
				match,
				lineup,
				candidates,
				warnings: warningsOf(lineup),
				maxSize: LINEUP_SIZE,
				needsAttention: lineupNeedsAttention(matchId),
				spotsOpen: lineup.filter((p) => p.droppedOut).map((p) => ({ id: p.id, name: p.name }))
			};
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
				db.prepare('UPDATE matches SET lineup_needs_attention = 0 WHERE id = ?').run(matchId);
				db.prepare('DELETE FROM lineup_players WHERE match_id = ?').run(matchId);
				const insert = db.prepare('INSERT INTO lineup_players (match_id, member_id, picked_at) VALUES (?, ?, ?)');
				const now = clock.now().toISOString();
				for (const id of memberIds) insert.run(matchId, id, now);
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
			const empty = () => ({ yes: 0, maybe: 0, no: 0, reconfirm: 0 });
			const answers = new Map<string, Record<MatchAnswer | 'reconfirm', number>>();
			for (const r of db
				.prepare(
					`SELECT r.match_id, r.answer, r.needs_reconfirm, count(*) AS n FROM match_responses r
					 JOIN members p ON p.id = r.member_id JOIN matches m ON m.id = r.match_id
					 WHERE m.club_id = ? AND p.active = 1 GROUP BY r.match_id, r.answer, r.needs_reconfirm`
				)
				.all(clubId) as { match_id: string; answer: MatchAnswer; needs_reconfirm: number; n: number }[]) {
				const counts = answers.get(r.match_id) ?? empty();
				counts[effectiveAnswer(r.answer, r.needs_reconfirm === 1)!] += r.n;
				answers.set(r.match_id, counts);
			}
			const spotsOpen = spotsOpenByMatch(clubId);
			return calendar
				.listMatches(clubId)
				.filter((m) => isAdmin || captainOf.has(m.team.id))
				.map((m) => ({
					...m,
					lineupSize: sizes.get(m.id) ?? 0,
					needsAttention: lineupNeedsAttention(m.id),
					spotsOpen: spotsOpen.get(m.id) ?? 0,
					lineupMax: LINEUP_SIZE,
					answers: answers.get(m.id) ?? empty()
				}));
		},

		/** The captain has checked the line-up after a reschedule and it can stay as it is. */
		markLineupReviewed(actor: Actor | undefined, clubId: string, matchId: string): void {
			managedMatch(actor, clubId, matchId);
			db.prepare('UPDATE matches SET lineup_needs_attention = 0 WHERE id = ?').run(matchId);
		},

		/**
		 * Whether the actor may act as captain for the match (its team's captain or an admin, signed in):
		 * change its line-up, move it.
		 */
		canCaptainMatch(actor: Actor | undefined, clubId: string, matchId: string): boolean {
			const match = calendar.getMatch(clubId, matchId);
			return !!match && rules.canCaptain(actor, clubId, match.team.id);
		},

		/** The match's line-up as any member sees it: names and teams, by name. */
		matchLineup(
			actor: Actor | undefined,
			clubId: string,
			matchId: string
		): { id: string; name: string; fromOtherTeam: boolean; droppedOut: boolean }[] {
			rules.requireMember(actor, clubId);
			const match = calendar.getMatch(clubId, matchId);
			if (!match) throw new NotFoundError('No such match in this club');
			return lineupOf(clubId, match).map((c) => ({ id: c.id, name: c.name, fromOtherTeam: c.fromOtherTeam, droppedOut: c.droppedOut }));
		},

		spotsOpenByMatch,

		/** The active member, if they are in the match's line-up. */
		lineupPlayer(matchId: string, memberId: string): { id: string; name: string } | undefined {
			return db
				.prepare(
					`SELECT p.id, p.name FROM lineup_players l JOIN members p ON p.id = l.member_id
					 WHERE l.match_id = ? AND l.member_id = ? AND p.active = 1`
				)
				.get(matchId, memberId) as { id: string; name: string } | undefined;
		},

		/** Active line-up members of each of the club's matches (for clash checks). */
		activeLineupsByMatch(clubId: string): Map<string, { id: string; name: string }[]> {
			const rows = db
				.prepare(
					`SELECT l.match_id, p.id, p.name FROM lineup_players l
					 JOIN matches m ON m.id = l.match_id JOIN members p ON p.id = l.member_id
					 WHERE m.club_id = ? AND p.active = 1`
				)
				.all(clubId) as { match_id: string; id: string; name: string }[];
			const byMatch = new Map<string, { id: string; name: string }[]>();
			for (const r of rows) byMatch.set(r.match_id, [...(byMatch.get(r.match_id) ?? []), { id: r.id, name: r.name }]);
			return byMatch;
		},

		/** Ids of the matches the member is in the line-up for. */
		lineupMatchIdsOf(memberId: string): Set<string> {
			const rows = db.prepare('SELECT match_id FROM lineup_players WHERE member_id = ?').all(memberId) as { match_id: string }[];
			return new Set(rows.map((r) => r.match_id));
		}
	};
}
