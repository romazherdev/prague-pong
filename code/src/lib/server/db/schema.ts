import type Database from 'better-sqlite3';

/** Ordered list of migrations. Append only; never edit a migration that has shipped. */
const migrations: string[] = [
	`
	CREATE TABLE clubs (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		slug TEXT NOT NULL UNIQUE,
		time_zone TEXT NOT NULL DEFAULT 'Europe/Prague'
	);
	-- Venues are shared: several clubs can play at the same hall.
	CREATE TABLE venues (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		address TEXT NOT NULL
	);
	CREATE TABLE teams (
		id TEXT PRIMARY KEY,
		club_id TEXT NOT NULL REFERENCES clubs(id),
		name TEXT NOT NULL,
		UNIQUE (club_id, name)
	);
	CREATE TABLE matches (
		id TEXT PRIMARY KEY,
		club_id TEXT NOT NULL REFERENCES clubs(id),
		team_id TEXT NOT NULL REFERENCES teams(id),
		venue_id TEXT NOT NULL REFERENCES venues(id),
		opponent TEXT NOT NULL,
		is_home INTEGER NOT NULL,
		starts_at TEXT NOT NULL, -- ISO 8601, UTC
		stis_id TEXT,
		UNIQUE (club_id, stis_id)
	);
	CREATE INDEX matches_club_starts ON matches (club_id, starts_at);
	`,
	// STIS calendar exports carry no match id: fixtures are identified by competition + home + away (ADR 0002).
	`
	ALTER TABLE matches RENAME COLUMN stis_id TO fixture_key;
	ALTER TABLE matches ADD COLUMN competition TEXT;
	ALTER TABLE matches ADD COLUMN ends_at TEXT; -- ISO 8601, UTC
	CREATE INDEX venues_address ON venues (lower(address));
	`
];

export function migrate(db: Database.Database): void {
	const current = db.pragma('user_version', { simple: true }) as number;
	for (let v = current; v < migrations.length; v++) {
		db.transaction(() => {
			db.exec(migrations[v]);
			db.pragma(`user_version = ${v + 1}`);
		})();
	}
}
