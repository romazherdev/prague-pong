import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { firstName, translator } from '#lib/i18n/messages.js';
import { isLocale, type Locale } from '#lib/i18n/locales.js';
import { accessRules, InvalidInputError, normaliseEmail, NotFoundError, type Actor } from './access';
import type { Team } from './calendar';
import type { Clock } from './ports';
import { newSecret } from './secrets';

export type MemberSummary = {
	id: string;
	name: string;
	email: string | null;
	isAdmin: boolean;
	/** The league team they play for; null for training-only members. */
	team: Team | null;
};

export type PersonalLinkMember = { actor: Actor; name: string; language: Locale | null };

/** The cookies that can tell who uses a device. */
export type DeviceIdentity = { linkToken?: string; sessionToken?: string };

type MemberRow = {
	id: string;
	name: string;
	email: string | null;
	is_admin: number;
	team_id: string | null;
	team_name: string | null;
};

const MEMBER_SELECT = `SELECT m.id, m.name, m.email, m.is_admin, m.active, m.stis_player_id, t.id AS team_id, t.name AS team_name
	FROM members m LEFT JOIN teams t ON t.id = m.team_id`;

const toSummary = (r: MemberRow): MemberSummary => ({
	id: r.id,
	name: r.name,
	email: r.email,
	isAdmin: r.is_admin === 1,
	team: r.team_id ? { id: r.team_id, name: r.team_name! } : null
});
/**
 * Adds an active member with a new personal link, after checking the name and email. Shared by every way a
 * member gets created (by hand, from a roster).
 */
export function insertMember(db: Database.Database, clubId: string, input: { name: string; email?: string | null }): MemberSummary {
	const { name, email } = validMemberDetails(db, clubId, input);
	const id = randomUUID();
	db.prepare('INSERT INTO members (id, club_id, name, email, link_token) VALUES (?, ?, ?, ?, ?)').run(id, clubId, name, email, newSecret());
	return { id, name, email, isAdmin: false, team: null };
}

/** Trimmed name and normalised email, checked: a name is required, and an email belongs to one member. */
function validMemberDetails(db: Database.Database, clubId: string, input: { name: string; email?: string | null }, memberId?: string) {
	const name = input.name.trim().replace(/\s+/g, ' ');
	if (!name) throw new InvalidInputError('nameRequired');
	const email = input.email?.trim() ? normaliseEmail(input.email) : null;
	if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new InvalidInputError('emailInvalid');
	if (email) {
		const taken = db.prepare('SELECT id FROM members WHERE club_id = ? AND email = ? AND id IS NOT ?').get(clubId, email, memberId ?? null);
		if (taken) throw new InvalidInputError('emailTaken');
	}
	return { name, email };
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'cs');

export function membersModule(deps: { db: Database.Database; clock: Clock }) {
	const { db, clock } = deps;
	const rules = accessRules(db);

	const listByActive = (clubId: string, active: boolean) =>
		(
			db.prepare(`${MEMBER_SELECT} WHERE m.club_id = ? AND m.active = ?`).all(clubId, active ? 1 : 0) as MemberRow[]
		)
			.map(toSummary)
			.sort(byName);

	/** The member, if they belong to the club (active or not); NotFoundError otherwise. */
	function memberOfClub(clubId: string, memberId: string) {
		const m = rules.member(memberId);
		if (!m || m.club_id !== clubId) throw new NotFoundError('No such member in this club');
		return m;
	}

	/** The member behind a device's personal-link cookie or, failing that, its session. */
	const deviceMemberId = (device: DeviceIdentity): string | undefined =>
		(device.linkToken &&
			(db.prepare('SELECT id FROM members WHERE link_token = ? AND active = 1').get(device.linkToken) as { id: string } | undefined)
				?.id) ||
		(device.sessionToken ? rules.memberIdBySession(device.sessionToken, clock.now()) : undefined);

	const linkToken = (memberId: string) =>
		(db.prepare('SELECT link_token FROM members WHERE id = ?').get(memberId) as { link_token: string }).link_token;

	return {
		/** The club's active members, by name (Czech collation). Admins only. */
		listMembers(actor: Actor | undefined, clubId: string): MemberSummary[] {
			rules.requireAdmin(actor, clubId);
			return listByActive(clubId, true);
		},

		/** Members who left the club; kept so their history stays. Admins only. */
		listInactiveMembers(actor: Actor | undefined, clubId: string): MemberSummary[] {
			rules.requireAdmin(actor, clubId);
			return listByActive(clubId, false);
		},

		/** Adds a member with a new personal link. Email is optional (only captains and admins need one). Admins only. */
		addMember(actor: Actor | undefined, clubId: string, input: { name: string; email?: string | null }): MemberSummary {
			rules.requireAdmin(actor, clubId);
			return insertMember(db, clubId, input);
		},

		/** Changes a member's name and email. Admins only. */
		updateMember(actor: Actor | undefined, clubId: string, memberId: string, input: { name: string; email?: string | null }): void {
			rules.requireAdmin(actor, clubId);
			memberOfClub(clubId, memberId);
			const { name, email } = validMemberDetails(db, clubId, input, memberId);
			db.prepare('UPDATE members SET name = ?, email = ? WHERE id = ?').run(name, email, memberId);
		},

		/**
		 * A member who left: hidden from lists and line-ups, their personal link and sign-in stop working,
		 * and any team they captained has no captain. Their history stays. Admins only, not on themselves.
		 */
		deactivateMember(actor: Actor | undefined, clubId: string, memberId: string): void {
			const me = rules.requireAdmin(actor, clubId);
			memberOfClub(clubId, memberId);
			if (me.id === memberId) throw new InvalidInputError('cannotDeactivateSelf');
			db.transaction(() => {
				db.prepare('UPDATE members SET active = 0 WHERE id = ?').run(memberId);
				db.prepare('UPDATE teams SET captain_member_id = NULL WHERE captain_member_id = ?').run(memberId);
				db.prepare('DELETE FROM sessions WHERE member_id = ?').run(memberId);
			})();
		},

		reactivateMember(actor: Actor | undefined, clubId: string, memberId: string): void {
			rules.requireAdmin(actor, clubId);
			memberOfClub(clubId, memberId);
			db.prepare('UPDATE members SET active = 1 WHERE id = ?').run(memberId);
		},

		/** Gives the member a new personal link; the old one stops working at once. Admins only. */
		regeneratePersonalLink(actor: Actor | undefined, clubId: string, memberId: string): void {
			rules.requireAdmin(actor, clubId);
			memberOfClub(clubId, memberId);
			db.prepare('UPDATE members SET link_token = ? WHERE id = ?').run(newSecret(), memberId);
		},

		/**
		 * The member's personal link and a ready-to-send WhatsApp message containing it, for the admin to
		 * send privately. Admins only.
		 */
		personalLinkMessage(
			actor: Actor | undefined,
			clubId: string,
			memberId: string,
			opts: { origin: string; locale: Locale }
		): { url: string; text: string } {
			rules.requireAdmin(actor, clubId);
			const m = memberOfClub(clubId, memberId);
			const club = db.prepare('SELECT name, slug FROM clubs WHERE id = ?').get(clubId) as { name: string; slug: string };
			const url = `${opts.origin}/${club.slug}/m/${linkToken(memberId)}`;
			const text = translator(opts.locale)('personalLink.message', { name: firstName(m.name), club: club.name, link: url });
			return { url, text };
		},

		/** The active member a personal link belongs to, in this club; undefined for anything else. */
		memberByPersonalLink(clubId: string, token: string | undefined): PersonalLinkMember | undefined {
			if (!token) return undefined;
			const row = db
				.prepare('SELECT id, name, language FROM members WHERE link_token = ? AND club_id = ? AND active = 1')
				.get(token, clubId) as { id: string; name: string; language: string | null } | undefined;
			return (
				row && {
					actor: { via: 'personal-link', memberId: row.id },
					name: row.name,
					language: isLocale(row.language) ? row.language : null
				}
			);
		},

		/** Saves the member's language, so it applies on every device they open their link on. */
		setMyLanguage(actor: Actor | undefined, clubId: string, locale: Locale): void {
			const me = rules.requireMember(actor, clubId);
			db.prepare('UPDATE members SET language = ? WHERE id = ?').run(locale, me.id);
		},

		/**
		 * The saved language of whoever uses this device: the member behind the personal-link cookie, else the
		 * signed-in member. Not club-scoped: it only picks a language.
		 */
		savedLanguage(device: DeviceIdentity): Locale | null {
			const id = deviceMemberId(device);
			const row = id && (db.prepare('SELECT language FROM members WHERE id = ?').get(id) as { language: string | null });
			return row && isLocale(row.language) ? row.language : null;
		},

		/** Saves a language switch with the device's member (see `savedLanguage`), so it follows them to other devices. */
		saveLanguageForDevice(device: DeviceIdentity, locale: Locale): void {
			const id = deviceMemberId(device);
			if (id) db.prepare('UPDATE members SET language = ? WHERE id = ?').run(locale, id);
		},

		/** Puts a member on one of the club's teams, or on none (`null`: e.g. training only). Admins only. */
		setMemberTeam(actor: Actor | undefined, clubId: string, memberId: string, teamId: string | null): void {
			rules.requireAdmin(actor, clubId);
			memberOfClub(clubId, memberId);
			if (teamId && !db.prepare('SELECT 1 FROM teams WHERE id = ? AND club_id = ?').get(teamId, clubId)) {
				throw new NotFoundError('No such team in this club');
			}
			db.prepare('UPDATE members SET team_id = ? WHERE id = ?').run(teamId, memberId);
		},

		/** One member of the club, active or not, for the admin's member page. Admins only. */
		getMember(
			actor: Actor | undefined,
			clubId: string,
			memberId: string
		): MemberSummary & { active: boolean; stisPlayerId: string | null } {
			rules.requireAdmin(actor, clubId);
			memberOfClub(clubId, memberId);
			const row = db.prepare(`${MEMBER_SELECT} WHERE m.id = ?`).get(memberId) as MemberRow & {
				active: number;
				stis_player_id: string | null;
			};
			return { ...toSummary(row), active: row.active === 1, stisPlayerId: row.stis_player_id };
		}
	};
}
