import type Database from 'better-sqlite3';

/**
 * The rule for a match that moved to a new date or time, however it happened (a reschedule in the app or
 * an applied STIS change): every yes and maybe must be confirmed again, and the line-up needs the
 * captain's attention. "No" stays "no".
 */
export function markMatchMoved(db: Database.Database, matchId: string): void {
	db.prepare('UPDATE matches SET lineup_needs_attention = 1 WHERE id = ?').run(matchId);
	db.prepare("UPDATE match_responses SET needs_reconfirm = 1 WHERE match_id = ? AND answer IN ('yes', 'maybe')").run(matchId);
}
