import type Database from 'better-sqlite3';
import { randomBytes, randomUUID } from 'node:crypto';
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
			endsAt?: string;
			competition?: string;
		}) {
			const id = randomUUID();
			db.prepare(
				`INSERT INTO matches (id, club_id, team_id, venue_id, opponent, is_home, starts_at, ends_at, competition)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).run(
				id,
				input.clubId,
				input.teamId,
				input.venueId,
				input.opponent,
				input.isHome ? 1 : 0,
				input.startsAt,
				input.endsAt ?? null,
				input.competition ?? null
			);
			return { id, ...input };
		},
		member(input: { clubId: string; name: string; email?: string; isAdmin?: boolean; active?: boolean }) {
			const id = randomUUID();
			db.prepare(
				'INSERT INTO members (id, club_id, name, email, is_admin, active, link_token) VALUES (?, ?, ?, ?, ?, ?, ?)'
			).run(
				id,
				input.clubId,
				input.name,
				input.email?.toLowerCase() ?? null,
				input.isAdmin ? 1 : 0,
				input.active === false ? 0 : 1,
				randomBytes(32).toString('base64url')
			);
			return { id, ...input };
		}
	};
}
