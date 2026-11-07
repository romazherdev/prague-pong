import type Database from 'better-sqlite3';
import type { Clock, Notifier } from './ports';
import { resolveLocale } from './locale';
import { localDate, wallClockToUtc } from './time';
import { randomUUID } from 'node:crypto';

/** A match as listed in the club calendar. */
export type CalendarMatch = {
	id: string;
	team: { id: string; name: string };
	opponent: string;
	isHome: boolean;
	venue: { name: string; address: string };
	startsAt: string;
};

/** A match with all its details, for the match page. */
export type MatchDetail = CalendarMatch & {
	/** ISO 8601, UTC; null if the source didn't give an end time. */
	endsAt: string | null;
	/** League competition code, e.g. "6TMA"; null for matches not imported from STIS. */
	competition: string | null;
};

type MatchRow = {
	id: string;
	opponent: string;
	is_home: number;
	starts_at: string;
	ends_at: string | null;
	competition: string | null;
	team_id: string;
	team_name: string;
	venue_name: string;
	venue_address: string;
};

const MATCH_SELECT = `SELECT m.id, m.opponent, m.is_home, m.starts_at, m.ends_at, m.competition,
	       t.id AS team_id, t.name AS team_name, v.name AS venue_name, v.address AS venue_address
	FROM matches m
	JOIN teams t ON t.id = m.team_id
	JOIN venues v ON v.id = m.venue_id`;

const toCalendarMatch = (r: MatchRow): CalendarMatch => ({
	id: r.id,
	team: { id: r.team_id, name: r.team_name },
	opponent: r.opponent,
	isHome: r.is_home === 1,
	venue: { name: r.venue_name, address: r.venue_address },
	startsAt: r.starts_at
});

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

export type ImportResult = {
	added: number;
	/** Existing fixtures whose details changed in the source and were updated (only with applyChanges). */
	updated: number;
	unchanged: number;
	/** Keys of fixtures that changed in the source but were left as they are (the default). */
	changedNotApplied: string[];
};

export type Team = { id: string; name: string };

export type MatchFilter = {
	/** Only this team's matches. */
	teamId?: string;
	/** Also show matches played before today. */
	includePast?: boolean;
};

export const DEFAULT_TIME_ZONE = 'Europe/Prague';

export type Club = { id: string; name: string; slug: string; timeZone: string };

export type ClubCore = ReturnType<typeof createClubCore>;

export function createClubCore(deps: { db: Database.Database; clock: Clock; notifier: Notifier }) {
	const { db, clock } = deps;

	const clubTimeZone = (clubId: string) =>
		(db.prepare('SELECT time_zone FROM clubs WHERE id = ?').get(clubId) as { time_zone: string } | undefined)
			?.time_zone;

	return {
		resolveLocale,

		createClub(input: { name: string; slug: string; timeZone?: string }): Club {
			const club = { id: randomUUID(), name: input.name, slug: input.slug, timeZone: input.timeZone ?? DEFAULT_TIME_ZONE };
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
		 * Adds the club's league fixtures. Matching is by fixture key, so importing the same schedule again
		 * changes nothing. A fixture whose date, venue or details changed in the source is reported in
		 * `changedNotApplied` and left alone, because moving a match must go through a reschedule (members'
		 * answers need reconfirming). `applyChanges: true` updates such fixtures in place instead.
		 * All or nothing: if any fixture is invalid, nothing is imported.
		 */
		importSeasonFixtures(
			clubId: string,
			fixtures: FixtureImport[],
			opts: { applyChanges?: boolean } = {}
		): ImportResult {
			const timeZone = clubTimeZone(clubId);
			if (!timeZone) throw new Error(`Unknown club ${clubId}`);

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
			const ensureTeam = (name: string) => {
				const existing = idOf(findTeam.get(clubId, name));
				if (existing) return existing;
				const id = randomUUID();
				insertTeam.run(id, clubId, name);
				return id;
			};
			const findOrCreateVenue = (venue: { name: string; address: string }) => {
				const address = venue.address.trim().replace(/\s+/g, ' ');
				const existing = idOf(findVenue.get(address));
				if (existing) return existing;
				const id = randomUUID();
				insertVenue.run(id, venue.name.trim(), address);
				return id;
			};

			return db.transaction(() => {
				const result: ImportResult = { added: 0, updated: 0, unchanged: 0, changedNotApplied: [] };
				for (const f of fixtures) {
					const row = {
						clubId,
						fixtureKey: f.fixtureKey,
						teamId: ensureTeam(f.teamName),
						venueId: findOrCreateVenue(f.venue),
						opponent: f.opponent,
						isHome: f.isHome ? 1 : 0,
						startsAt: wallClockToUtc(f.startsLocal, timeZone),
						endsAt: wallClockToUtc(f.endsLocal, timeZone),
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
						if (opts.applyChanges) {
							updateMatch.run({ id: existing.id, ...row });
							result.updated++;
						} else {
							result.changedNotApplied.push(f.fixtureKey);
						}
					} else {
						result.unchanged++;
					}
				}
				return result;
			})();
		},

		/** The club's league teams, by name. */
		listTeams(clubId: string): Team[] {
			return db.prepare('SELECT id, name FROM teams WHERE club_id = ? ORDER BY name').all(clubId) as Team[];
		},

		/**
		 * The club calendar, soonest first. By default only matches from today (in the club's time zone)
		 * onwards; `includePast` shows the whole season. `teamId` narrows it to one team.
		 */
		listMatches(clubId: string, filter: MatchFilter = {}): CalendarMatch[] {
			const timeZone = clubTimeZone(clubId);
			if (!timeZone) return [];
			const today = localDate(clock.now(), timeZone);

			const rows = db
				.prepare(`${MATCH_SELECT} WHERE m.club_id = @clubId AND (@teamId IS NULL OR m.team_id = @teamId) ORDER BY m.starts_at`)
				.all({ clubId, teamId: filter.teamId ?? null }) as MatchRow[];

			return rows
				.filter((r) => filter.includePast || localDate(new Date(r.starts_at), timeZone) >= today)
				.map(toCalendarMatch);
		},

		/** One of the club's matches, past or upcoming; undefined if the club has no such match. */
		getMatch(clubId: string, matchId: string): MatchDetail | undefined {
			const row = db.prepare(`${MATCH_SELECT} WHERE m.club_id = ? AND m.id = ?`).get(clubId, matchId) as
				| MatchRow
				| undefined;
			return row && { ...toCalendarMatch(row), endsAt: row.ends_at, competition: row.competition };
		}
	};
}
