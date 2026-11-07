import type Database from 'better-sqlite3';
import type { calendarModule } from './calendar';
import type { lineupsModule } from './lineups';
import type { Notifier } from './ports';
import type { AnswerChange } from './responses';

/** Notification sent when a line-up player changes their answer to "no". */
export type SpotOpenIntent = {
	kind: 'spotOpen';
	recipientMemberId: string;
	data: { matchId: string; memberId: string; memberName: string };
};

/**
 * Reacts to a line-up player dropping out (answer changed to "no"): tells the team's captain, or the
 * admins when the team has no captain (or the captain is the one dropping out). Never swaps anyone in.
 * The open spot itself is derived from the answers (`spotsOpen` in the line-up view and calendar).
 */
export function dropoutsModule(deps: {
	db: Database.Database;
	notifier: Notifier;
	calendar: ReturnType<typeof calendarModule>;
	lineups: ReturnType<typeof lineupsModule>;
}) {
	const { db, notifier, calendar, lineups } = deps;

	function recipients(clubId: string, teamId: string, droppedOut: string): string[] {
		const captain = db
			.prepare('SELECT m.id FROM teams t JOIN members m ON m.id = t.captain_member_id WHERE t.id = ? AND m.active = 1')
			.get(teamId) as { id: string } | undefined;
		if (captain && captain.id !== droppedOut) return [captain.id];
		return (
			db.prepare('SELECT id FROM members WHERE club_id = ? AND is_admin = 1 AND active = 1 AND id != ? ORDER BY name').all(clubId, droppedOut) as {
				id: string;
			}[]
		).map((m) => m.id);
	}

	return {
		onAnswerChanged(change: AnswerChange): void {
			const wasNo = change.before?.answer === 'no' && !change.before.needsReconfirm;
			if (change.after !== 'no' || wasNo) return;
			const player = lineups.activeLineupsByMatch(change.clubId).get(change.matchId)?.find((p) => p.id === change.memberId);
			if (!player) return;
			const match = calendar.getMatch(change.clubId, change.matchId);
			if (!match) return;
			for (const recipientMemberId of recipients(change.clubId, match.team.id, change.memberId)) {
				const intent: SpotOpenIntent = {
					kind: 'spotOpen',
					recipientMemberId,
					data: { matchId: change.matchId, memberId: player.id, memberName: player.name }
				};
				notifier.send(intent);
			}
		}
	};
}
