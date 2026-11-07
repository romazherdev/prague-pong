import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { DEFAULT_TIME_ZONE } from '../core/club-core';

/**
 * Inserts arrange-data for tests and the dev seed script.
 * Not part of the club core: production data arrives through core commands (e.g. the STIS import).
 */
export function seedBuilders(db: Database.Database) {
	return {
		club(input: { name: string; slug?: string; timeZone?: string }) {
			const id = randomUUID();
			const slug = input.slug ?? id;
			db.prepare('INSERT INTO clubs (id, name, slug, time_zone) VALUES (?, ?, ?, ?)').run(
				id,
				input.name,
				slug,
				input.timeZone ?? DEFAULT_TIME_ZONE
			);
			return { id, ...input, slug };
		},
		team(input: { clubId: string; name: string }) {
			const id = randomUUID();
			db.prepare('INSERT INTO teams (id, club_id, name) VALUES (?, ?, ?)').run(id, input.clubId, input.name);
			return { id, ...input };
		},
		venue(input: { name: string; address: string }) {
			const id = randomUUID();
			db.prepare('INSERT INTO venues (id, name, address) VALUES (?, ?, ?)').run(id, input.name, input.address);
			return { id, ...input };
		},
		match(input: {
			clubId: string;
			teamId: string;
			venueId: string;
			opponent: string;
			isHome: boolean;
			startsAt: string;
		}) {
			const id = randomUUID();
			db.prepare(
				`INSERT INTO matches (id, club_id, team_id, venue_id, opponent, is_home, starts_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`
			).run(id, input.clubId, input.teamId, input.venueId, input.opponent, input.isHome ? 1 : 0, input.startsAt);
			return { id, ...input };
		}
	};
}
