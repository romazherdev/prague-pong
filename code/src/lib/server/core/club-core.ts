import type Database from 'better-sqlite3';
import type { Clock, Notifier } from './ports';
import { resolveLocale } from './locale';

export type UpcomingMatch = {
	id: string;
	team: { id: string; name: string };
	opponent: string;
	isHome: boolean;
	venue: { name: string; address: string };
	startsAt: string;
};

export type Club = { id: string; name: string; slug: string; timeZone: string };

export type ClubCore = ReturnType<typeof createClubCore>;

/** Local calendar date (YYYY-MM-DD) of an instant in a time zone. */
function localDate(instant: Date, timeZone: string): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
		instant
	);
}

export function createClubCore(deps: { db: Database.Database; clock: Clock; notifier: Notifier }) {
	const { db, clock } = deps;

	return {
		resolveLocale,

		findClubBySlug(slug: string): Club | undefined {
			const row = db.prepare('SELECT id, name, slug, time_zone FROM clubs WHERE slug = ?').get(slug) as
				| { id: string; name: string; slug: string; time_zone: string }
				| undefined;
			return row && { id: row.id, name: row.name, slug: row.slug, timeZone: row.time_zone };
		},

		/** Matches from today (in the club's time zone) onwards, soonest first. */
		listUpcomingMatches(clubId: string): UpcomingMatch[] {
			const club = db.prepare('SELECT time_zone FROM clubs WHERE id = ?').get(clubId) as
				| { time_zone: string }
				| undefined;
			if (!club) return [];
			const today = localDate(clock.now(), club.time_zone);

			const rows = db
				.prepare(
					`SELECT m.id, m.opponent, m.is_home, m.starts_at,
					        t.id AS team_id, t.name AS team_name, v.name AS venue_name, v.address AS venue_address
					 FROM matches m
					 JOIN teams t ON t.id = m.team_id
					 JOIN venues v ON v.id = m.venue_id
					 WHERE m.club_id = ?
					 ORDER BY m.starts_at`
				)
				.all(clubId) as {
				id: string;
				opponent: string;
				is_home: number;
				starts_at: string;
				team_id: string;
				team_name: string;
				venue_name: string;
				venue_address: string;
			}[];

			return rows
				.filter((r) => localDate(new Date(r.starts_at), club.time_zone) >= today)
				.map((r) => ({
					id: r.id,
					team: { id: r.team_id, name: r.team_name },
					opponent: r.opponent,
					isHome: r.is_home === 1,
					venue: { name: r.venue_name, address: r.venue_address },
					startsAt: r.starts_at
				}));
		}
	};
}
