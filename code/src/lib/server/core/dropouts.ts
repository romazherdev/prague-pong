import type Database from 'better-sqlite3';
import { effectiveAnswer } from '#lib/answers.js';
import { accessRules } from './access';
import type { calendarModule } from './calendar';
import type { lineupsModule } from './lineups';
import type { NotificationIntent } from './ports';
import type { AnswerChange } from './responses';

/** Notification for a line-up player who changed their answer to "no". */
export type SpotOpenIntent = NotificationIntent & {
	kind: 'spotOpen';
	data: { matchId: string; memberId: string; memberName: string };
};

/**
 * Reacts to a line-up player dropping out (answer changed to "no"): the team's captain is to be told, or
 * the admins when the team has no captain or the captain is the one dropping out. Never swaps anyone in.
 * The open spot itself is derived (`lineups.spotsOpen…`).
 */
export function dropoutsModule(deps: {
	db: Database.Database;
	calendar: ReturnType<typeof calendarModule>;
	lineups: ReturnType<typeof lineupsModule>;
}) {
	const { calendar, lineups } = deps;
	const rules = accessRules(deps.db);

	function recipients(clubId: string, teamId: string, droppedOut: string): string[] {
		const captain = rules.activeCaptainOf(teamId);
		if (captain && captain !== droppedOut) return [captain];
		return rules.activeAdminIds(clubId).filter((id) => id !== droppedOut);
	}

	return {
		/** Who to notify about this answer change (see responsesModule's onAnswerChanged). */
		onAnswerChanged(change: AnswerChange): SpotOpenIntent[] {
			const wasNo = change.before && effectiveAnswer(change.before.answer, change.before.needsReconfirm) === 'no';
			if (change.after !== 'no' || wasNo) return [];
			const player = lineups.lineupPlayer(change.matchId, change.memberId);
			const match = player && calendar.getMatch(change.clubId, change.matchId);
			if (!player || !match) return [];
			return recipients(change.clubId, match.team.id, change.memberId).map((recipientMemberId) => ({
				kind: 'spotOpen',
				recipientMemberId,
				data: { matchId: change.matchId, memberId: player.id, memberName: player.name }
			}));
		}
	};
}
