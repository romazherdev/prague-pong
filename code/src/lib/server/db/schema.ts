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
	`,
	// Members, captains and magic-link sign-in (ticket 04). Secrets are stored only as SHA-256 hashes.
	`
	CREATE TABLE members (
		id TEXT PRIMARY KEY,
		club_id TEXT NOT NULL REFERENCES clubs(id),
		name TEXT NOT NULL,
		email TEXT, -- lower-case; only needed for admins and captains
		is_admin INTEGER NOT NULL DEFAULT 0,
		active INTEGER NOT NULL DEFAULT 1,
		UNIQUE (club_id, email)
	);
	ALTER TABLE teams ADD COLUMN captain_member_id TEXT REFERENCES members(id);
	CREATE TABLE sign_in_links (
		token_hash TEXT PRIMARY KEY,
		member_id TEXT NOT NULL REFERENCES members(id),
		expires_at TEXT NOT NULL,
		used_at TEXT
	);
	CREATE TABLE sessions (
		token_hash TEXT PRIMARY KEY,
		member_id TEXT NOT NULL REFERENCES members(id),
		expires_at TEXT NOT NULL
	);
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
