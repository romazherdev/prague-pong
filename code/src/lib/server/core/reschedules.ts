import type Database from 'better-sqlite3';
import { accessRules, InvalidInputError, NotFoundError, type Actor } from './access';
import type { calendarModule } from './calendar';
import type { Clock } from './ports';
import { wallClockToUtc } from './time';

export function reschedulesModule(deps: { db: Database.Database; clock: Clock; calendar: ReturnType<typeof calendarModule> }) {
	const { db, clock, calendar } = deps;
	const rules = accessRules(db);

	return {
		/**
		 * Moves a match to a new date and time (wall clock in the club's time zone, "YYYY-MM-DDTHH:mm"),
		 * keeping its length. Every yes and maybe becomes "please reconfirm" (no stays no), and the line-up
		 * needs the captain's attention. The team's captain or an admin; not into the past.
		 */
		rescheduleMatch(actor: Actor | undefined, clubId: string, matchId: string, to: { startsLocal: string }): void {
			const match = calendar.getMatch(clubId, matchId);
			if (!match) {
				rules.requireMember(actor, clubId);
				throw new NotFoundError('No such match in this club');
			}
			rules.requireCaptainOf(actor, clubId, match.team.id);
			const timeZone = calendar.findClubById(clubId)!.timeZone;

			let startsAt: string;
			try {
				startsAt = wallClockToUtc(to.startsLocal, timeZone);
			} catch {
				throw new InvalidInputError('dateInvalid');
			}
			if (startsAt === match.startsAt) return;
			if (new Date(startsAt) <= clock.now()) throw new InvalidInputError('rescheduleInPast');
			const shift = new Date(startsAt).getTime() - new Date(match.startsAt).getTime();
			const endsAt = match.endsAt && new Date(new Date(match.endsAt).getTime() + shift).toISOString().replace('.000Z', 'Z');

			db.transaction(() => {
				db.prepare('UPDATE matches SET starts_at = ?, ends_at = ?, lineup_needs_attention = 1 WHERE id = ?').run(startsAt, endsAt, matchId);
				db.prepare("UPDATE match_responses SET needs_reconfirm = 1 WHERE match_id = ? AND answer IN ('yes', 'maybe')").run(matchId);
			})();
		}
	};
}
