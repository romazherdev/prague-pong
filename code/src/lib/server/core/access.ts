import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { translator } from '#lib/i18n/messages.js';
import type { Locale } from '#lib/i18n/locales.js';
import type { Clock, Mailer } from './ports';
import { hashSecret, newSecret } from './secrets';

/**
 * Who is asking. `session` comes from a magic-link sign-in and can carry admin or captain powers;
 * `personal-link` is a member's private link and only ever allows member actions.
 */
export type Actor = { via: 'session' | 'personal-link'; memberId: string };

/** The actor isn't allowed to do this (routes turn it into 403, or a redirect to sign-in). */
export class ForbiddenError extends Error {
	override name = 'ForbiddenError';
}

export type InvalidInputCode =
	| 'nameRequired'
	| 'emailTaken'
	| 'emailInvalid'
	| 'cannotDeactivateSelf'
	| 'matchPast';

/** The input breaks a rule; `code` says which, so routes can show a translated message. */
export class InvalidInputError extends Error {
	override name = 'InvalidInputError';
	constructor(readonly code: InvalidInputCode) {
		super(code);
	}
}

/** A command referred to something that doesn't exist in this club. */
export class NotFoundError extends Error {
	override name = 'NotFoundError';
}

export type SignedIn = {
	actor: Actor;
	name: string;
	isAdmin: boolean;
	/** Teams this member captains. */
	captainOf: { id: string; name: string }[];
};

export type TeamWithCaptain = { id: string; name: string; captain: { id: string; name: string } | null };

export const SIGN_IN_LINK_MINUTES = 15;
export const SESSION_DAYS = 60;
/** At most this many sign-in links per member are live at once (a link lives SIGN_IN_LINK_MINUTES). */
export const MAX_LIVE_SIGN_IN_LINKS = 3;

type MemberRow = { id: string; club_id: string; name: string; is_admin: number; active: number };

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

/** Permission checks shared by every core module. Roles are read live, so revoking one takes effect at once. */
export function accessRules(db: Database.Database) {
	const member = (id: string) =>
		db.prepare('SELECT id, club_id, name, is_admin, active FROM members WHERE id = ?').get(id) as MemberRow | undefined;

	const isActiveMemberOf = (memberId: string, clubId: string) => {
		const m = member(memberId);
		return !!m && m.club_id === clubId && m.active === 1;
	};

	/** The active member behind `actor` in `clubId`, or ForbiddenError. */
	function requireMember(actor: Actor | undefined, clubId: string): MemberRow {
		if (!actor || !isActiveMemberOf(actor.memberId, clubId)) throw new ForbiddenError('Not a member of this club');
		return member(actor.memberId)!;
	}

	function isAdmin(actor: Actor | undefined, clubId: string): boolean {
		if (actor?.via !== 'session') return false;
		const m = member(actor.memberId);
		return !!m && m.club_id === clubId && m.active === 1 && m.is_admin === 1;
	}

	function requireAdmin(actor: Actor | undefined, clubId: string): MemberRow {
		if (!isAdmin(actor, clubId)) throw new ForbiddenError('Admins only');
		return requireMember(actor, clubId);
	}

	/** Admins can act as captain for any team. */
	function requireCaptainOf(actor: Actor | undefined, clubId: string, teamId: string): MemberRow {
		if (isAdmin(actor, clubId)) return requireMember(actor, clubId);
		const m = actor?.via === 'session' ? requireMember(actor, clubId) : undefined;
		const team = db.prepare('SELECT captain_member_id FROM teams WHERE id = ? AND club_id = ?').get(teamId, clubId) as
			| { captain_member_id: string | null }
			| undefined;
		if (!m || !team || team.captain_member_id !== m.id) throw new ForbiddenError("Only this team's captain or an admin");
		return m;
	}

	/** The active member a live session belongs to (any club), for things that don't need a club, like language. */
	const memberIdBySession = (sessionToken: string, now: Date) =>
		(
			db
				.prepare(
					`SELECT m.id FROM sessions s JOIN members m ON m.id = s.member_id
					 WHERE s.token_hash = ? AND s.expires_at > ? AND m.active = 1`
				)
				.get(hashSecret(sessionToken), now.toISOString()) as { id: string } | undefined
		)?.id;

	return { member, isActiveMemberOf, requireMember, isAdmin, requireAdmin, requireCaptainOf, memberIdBySession };
}

export function accessModule(deps: { db: Database.Database; clock: Clock; mailer: Mailer }) {
	const { db, clock, mailer } = deps;
	const rules = accessRules(db);
	const now = () => clock.now();
	const iso = (d: Date) => d.toISOString();
	const club = (clubId: string) =>
		db.prepare('SELECT slug FROM clubs WHERE id = ?').get(clubId) as { slug: string } | undefined;

	const teamsCaptainedBy = (memberId: string) =>
		db.prepare('SELECT id, name FROM teams WHERE captain_member_id = ? ORDER BY name').all(memberId) as {
			id: string;
			name: string;
		}[];

	return {
		/**
		 * For the setup command: makes the member with this email an admin of the club, adding them if needed.
		 * Not guarded: whoever can run commands on the server already has full access.
		 */
		setUpAdmin(clubId: string, input: { name: string; email: string }): { id: string; name: string } {
			if (!club(clubId)) throw new NotFoundError(`Unknown club ${clubId}`);
			const email = normaliseEmail(input.email);
			const existing = db.prepare('SELECT id, name FROM members WHERE club_id = ? AND email = ?').get(clubId, email) as
				| { id: string; name: string }
				| undefined;
			if (existing) {
				db.prepare('UPDATE members SET is_admin = 1, active = 1 WHERE id = ?').run(existing.id);
				return existing;
			}
			const id = randomUUID();
			db.prepare('INSERT INTO members (id, club_id, name, email, is_admin, link_token) VALUES (?, ?, ?, ?, 1, ?)').run(
				id,
				clubId,
				input.name.trim(),
				email,
				newSecret()
			);
			return { id, name: input.name.trim() };
		},

		/**
		 * Emails a single-use sign-in link to an active admin or captain with this email. Does nothing for any
		 * other address, or when the member already has MAX_LIVE_SIGN_IN_LINKS live links. Callers must answer
		 * the same way whatever happens, so the form doesn't reveal who has an account.
		 */
		async requestSignIn(clubId: string, email: string, opts: { origin: string; locale: Locale }): Promise<void> {
			const c = club(clubId);
			const m = db
				.prepare(
					`SELECT m.id, m.email FROM members m
					 WHERE m.club_id = ? AND m.email = ? AND m.active = 1
					   AND (m.is_admin = 1 OR EXISTS (SELECT 1 FROM teams t WHERE t.captain_member_id = m.id))`
				)
				.get(clubId, normaliseEmail(email)) as { id: string; email: string } | undefined;
			if (!c || !m) return;
			const live = db
				.prepare('SELECT count(*) AS n FROM sign_in_links WHERE member_id = ? AND expires_at > ?')
				.get(m.id, iso(now())) as { n: number };
			if (live.n >= MAX_LIVE_SIGN_IN_LINKS) return;

			const token = newSecret();
			const expires = new Date(now().getTime() + SIGN_IN_LINK_MINUTES * 60_000);
			db.prepare('INSERT INTO sign_in_links (token_hash, member_id, expires_at) VALUES (?, ?, ?)').run(
				hashSecret(token),
				m.id,
				iso(expires)
			);
			const t = translator(opts.locale);
			const link = `${opts.origin}/${c.slug}/sign-in/${token}`;
			await mailer.send({
				to: m.email,
				subject: t('signIn.email.subject'),
				text: t('signIn.email.body', { link, minutes: String(SIGN_IN_LINK_MINUTES) })
			});
		},

		/** Uses up a sign-in link and starts a session. Undefined if the link is unknown, used, expired or another club's. */
		signIn(clubId: string, token: string): { sessionToken: string; memberId: string } | undefined {
			return db.transaction(() => {
				const link = db
					.prepare(
						`SELECT l.member_id, l.expires_at, l.used_at FROM sign_in_links l
						 JOIN members m ON m.id = l.member_id
						 WHERE l.token_hash = ? AND m.club_id = ? AND m.active = 1`
					)
					.get(hashSecret(token), clubId) as { member_id: string; expires_at: string; used_at: string | null } | undefined;
				if (!link || link.used_at || link.expires_at <= iso(now())) return undefined;

				db.prepare('UPDATE sign_in_links SET used_at = ? WHERE token_hash = ?').run(iso(now()), hashSecret(token));
				const sessionToken = newSecret();
				const expires = new Date(now().getTime() + SESSION_DAYS * 24 * 60 * 60_000);
				db.prepare('INSERT INTO sessions (token_hash, member_id, expires_at) VALUES (?, ?, ?)').run(
					hashSecret(sessionToken),
					link.member_id,
					iso(expires)
				);
				return { sessionToken, memberId: link.member_id };
			})();
		},

		/** Who a session cookie belongs to, with their current powers; undefined if it's not valid for this club. */
		whoIsSignedIn(clubId: string, sessionToken: string | undefined): SignedIn | undefined {
			if (!sessionToken) return undefined;
			const row = db
				.prepare(
					`SELECT m.id, m.name, m.is_admin FROM sessions s JOIN members m ON m.id = s.member_id
					 WHERE s.token_hash = ? AND s.expires_at > ? AND m.club_id = ? AND m.active = 1`
				)
				.get(hashSecret(sessionToken), iso(now()), clubId) as { id: string; name: string; is_admin: number } | undefined;
			if (!row) return undefined;
			return {
				actor: { via: 'session', memberId: row.id },
				name: row.name,
				isAdmin: row.is_admin === 1,
				captainOf: teamsCaptainedBy(row.id)
			};
		},

		signOut(sessionToken: string): void {
			db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSecret(sessionToken));
		},

		/** Makes a member the team's captain, or removes the captain with `null`. Admins only. */
		setCaptain(actor: Actor | undefined, clubId: string, teamId: string, memberId: string | null): void {
			rules.requireAdmin(actor, clubId);
			const team = db.prepare('SELECT id FROM teams WHERE id = ? AND club_id = ?').get(teamId, clubId);
			if (!team) throw new NotFoundError('No such team in this club');
			if (memberId !== null && !rules.isActiveMemberOf(memberId, clubId)) {
				throw new NotFoundError('No such active member in this club');
			}
			db.prepare('UPDATE teams SET captain_member_id = ? WHERE id = ?').run(memberId, teamId);
		},

		/** The club's teams and their captains, for the admin page. Admins only. */
		listTeamsWithCaptains(actor: Actor | undefined, clubId: string): TeamWithCaptain[] {
			rules.requireAdmin(actor, clubId);
			const rows = db
				.prepare(
					`SELECT t.id, t.name, m.id AS captain_id, m.name AS captain_name
					 FROM teams t LEFT JOIN members m ON m.id = t.captain_member_id
					 WHERE t.club_id = ? ORDER BY t.name`
				)
				.all(clubId) as { id: string; name: string; captain_id: string | null; captain_name: string | null }[];
			return rows.map((r) => ({
				id: r.id,
				name: r.name,
				captain: r.captain_id ? { id: r.captain_id, name: r.captain_name! } : null
			}));
		}
	};
}
