import type Database from 'better-sqlite3';
import type { Clock, Notifier } from './ports';
import { resolveLocale } from './locale';
import { localDate, wallClockToUtc } from './time';
import { randomUUID } from 'node:crypto';

export type UpcomingMatch = {
	id: string;
	team: { id: string; name: string };
	opponent: string;
	isHome: boolean;
	venue: { name: string; address: string };
	startsAt: string;
};

/** A league fixture as parsed from an external schedule (e.g. the STIS adapter), ready to import. */
export type FixtureImport = {
	/** Stable identity across re-imports, unique within the club. */
	fixtureKey: string;
	competition: string;
	/** The club's team, e.g. "A". Created if the club doesn't have it yet. */
	teamName: string;
	opponent: string;
	isHome: boolean;
	venue: { name: string; address: string };
	/** Wall-clock time in the club's time zone, "YYYY-MM-DDTHH:mm". */
	startsLocal: string;
	endsLocal: string;
};

export type ImportResult = { added: number; updated: number; unchanged: number };

export type Club = { id: string; name: string; slug: string; timeZone: string };

export type ClubCore = ReturnType<typeof createClubCore>;

export function createClubCore(deps: { db: Database.Database; clock: Clock; notifier: Notifier }) {
	const { db, clock } = deps;

	return {
		resolveLocale,

		createClub(input: { name: string; slug: string; timeZone?: string }): Club {
			const club = { id: randomUUID(), name: input.name, slug: input.slug, timeZone: input.timeZone ?? 'Europe/Prague' };
			db.prepare('INSERT INTO clubs (id, name, slug, time_zone) VALUES (?, ?, ?, ?)').run(
				club.id,
				club.name,
				club.slug,
				club.timeZone
			);
			return club;
		},

		findClubBySlug(slug: string): Club | undefined {
			const row = db.prepare('SELECT id, name, slug, time_zone FROM clubs WHERE slug = ?').get(slug) as
				| { id: string; name: string; slug: string; time_zone: string }
				| undefined;
			return row && { id: row.id, name: row.name, slug: row.slug, timeZone: row.time_zone };
		},

		/**
		 * Adds or updates the club's league fixtures. Matching is by fixture key, so importing the same
		 * schedule again changes nothing, and a fixture moved in the source is updated, not duplicated.
		 * All or nothing: if any fixture is invalid, nothing is imported.
		 */
		importSeasonFixtures(clubId: string, fixtures: FixtureImport[]): ImportResult {
			const club = db.prepare('SELECT time_zone FROM clubs WHERE id = ?').get(clubId) as
				| { time_zone: string }
				| undefined;
			if (!club) throw new Error(`Unknown club ${clubId}`);

			const findTeam = db.prepare('SELECT id FROM teams WHERE club_id = ? AND name = ?');
			const insertTeam = db.prepare('INSERT INTO teams (id, club_id, name) VALUES (?, ?, ?)');
			const findVenue = db.prepare('SELECT id FROM venues WHERE lower(address) = lower(?)');
			const insertVenue = db.prepare('INSERT INTO venues (id, name, address) VALUES (?, ?, ?)');
			const findMatch = db.prepare(
				`SELECT id, team_id, venue_id, opponent, is_home, starts_at, ends_at, competition
				 FROM matches WHERE club_id = ? AND fixture_key = ?`
			);
			const insertMatch = db.prepare(
				`INSERT INTO matches (id, club_id, team_id, venue_id, opponent, is_home, starts_at, ends_at, competition, fixture_key)
				 VALUES (@id, @clubId, @teamId, @venueId, @opponent, @isHome, @startsAt, @endsAt, @competition, @fixtureKey)`
			);
			const updateMatch = db.prepare(
				`UPDATE matches SET team_id = @teamId, venue_id = @venueId, opponent = @opponent, is_home = @isHome,
				        starts_at = @startsAt, ends_at = @endsAt, competition = @competition
				 WHERE id = @id`
			);

			const idOf = (row: unknown) => (row as { id: string } | undefined)?.id;
			const teamId = (name: string) => {
				const existing = idOf(findTeam.get(clubId, name));
				if (existing) return existing;
				const id = randomUUID();
				insertTeam.run(id, clubId, name);
				return id;
			};
			const venueId = (venue: { name: string; address: string }) => {
				const address = venue.address.trim().replace(/\s+/g, ' ');
				const existing = idOf(findVenue.get(address));
				if (existing) return existing;
				const id = randomUUID();
				insertVenue.run(id, venue.name.trim(), address);
				return id;
			};

			return db.transaction(() => {
				const result: ImportResult = { added: 0, updated: 0, unchanged: 0 };
				for (const f of fixtures) {
					const row = {
						clubId,
						fixtureKey: f.fixtureKey,
						teamId: teamId(f.teamName),
						venueId: venueId(f.venue),
						opponent: f.opponent,
						isHome: f.isHome ? 1 : 0,
						startsAt: wallClockToUtc(f.startsLocal, club.time_zone),
						endsAt: wallClockToUtc(f.endsLocal, club.time_zone),
						competition: f.competition
					};
					const existing = findMatch.get(clubId, f.fixtureKey) as
						| { id: string; team_id: string; venue_id: string; opponent: string; is_home: number; starts_at: string; ends_at: string | null; competition: string | null }
						| undefined;
					if (!existing) {
						insertMatch.run({ id: randomUUID(), ...row });
						result.added++;
					} else if (
						existing.team_id !== row.teamId ||
						existing.venue_id !== row.venueId ||
						existing.opponent !== row.opponent ||
						existing.is_home !== row.isHome ||
						existing.starts_at !== row.startsAt ||
						existing.ends_at !== row.endsAt ||
						existing.competition !== row.competition
					) {
						updateMatch.run({ id: existing.id, ...row });
						result.updated++;
					} else {
						result.unchanged++;
					}
				}
				return result;
			})();
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
