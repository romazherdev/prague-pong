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
	`,
	// Personal links and saved language (ticket 05). Link tokens are kept readable so an admin can re-send
	// a member's link at any time (ADR 0004).
	`
	ALTER TABLE members ADD COLUMN link_token TEXT;
	ALTER TABLE members ADD COLUMN language TEXT;
	UPDATE members SET link_token = lower(hex(randomblob(32))) WHERE link_token IS NULL;
	CREATE UNIQUE INDEX members_link_token ON members (link_token);
	`,
	// Team rosters from STIS and team assignment (ticket 06).
	`
	ALTER TABLE members ADD COLUMN team_id TEXT REFERENCES teams(id);
	ALTER TABLE members ADD COLUMN stis_player_id TEXT;
	-- One row per player on an imported STIS roster; member_id is set once the admin confirms who it is.
	CREATE TABLE roster_entries (
		id TEXT PRIMARY KEY,
		club_id TEXT NOT NULL REFERENCES clubs(id),
		entry_key TEXT NOT NULL, -- STIS player id, or team + normalised name when STIS gives no id
		team_id TEXT NOT NULL REFERENCES teams(id),
		player_name TEXT NOT NULL,
		stis_player_id TEXT,
		member_id TEXT REFERENCES members(id),
		UNIQUE (club_id, entry_key)
	);
	CREATE UNIQUE INDEX members_stis_player ON members (club_id, stis_player_id);
	`,
	// Members' answers to matches (ticket 07). One row per member and match: the latest answer wins.
	`
	CREATE TABLE match_responses (
		match_id TEXT NOT NULL REFERENCES matches(id),
		member_id TEXT NOT NULL REFERENCES members(id),
		answer TEXT NOT NULL CHECK (answer IN ('yes', 'maybe', 'no')),
		answered_at TEXT NOT NULL,
		PRIMARY KEY (match_id, member_id)
	);
	`,
	// Line-ups (ticket 08): the players a captain picked for a match. No order, at most 4 (checked in the core).
	`
	CREATE TABLE lineup_players (
		match_id TEXT NOT NULL REFERENCES matches(id),
		member_id TEXT NOT NULL REFERENCES members(id),
		PRIMARY KEY (match_id, member_id)
	);
	`,
	// Club settings for clash checks (ticket 09). No row means the defaults in core/settings.ts.
	`
	CREATE TABLE club_settings (
		club_id TEXT PRIMARY KEY REFERENCES clubs(id),
		total_tables INTEGER NOT NULL,
		tables_per_home_match INTEGER NOT NULL,
		min_training_tables INTEGER NOT NULL
	);
	`,
	// Reschedules (ticket 10): a moved match asks yes/maybe answers to be confirmed again, and flags its line-up.
	`
	ALTER TABLE match_responses ADD COLUMN needs_reconfirm INTEGER NOT NULL DEFAULT 0;
	ALTER TABLE matches ADD COLUMN lineup_needs_attention INTEGER NOT NULL DEFAULT 0;
	`,
	// Drop-outs (ticket 11): a spot is open when a player answered "no" after being picked.
	`
	ALTER TABLE lineup_players ADD COLUMN picked_at TEXT NOT NULL DEFAULT '';
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
