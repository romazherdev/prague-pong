import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { translator } from '#lib/i18n/messages.js';
import { isLocale, type Locale } from '#lib/i18n/locales.js';
import { accessRules, InvalidInputError, normaliseEmail, NotFoundError, type Actor } from './access';
import type { CalendarMatch, calendarModule } from './calendar';
import { hashSecret, newSecret } from './secrets';

export type MemberSummary = { id: string; name: string; email: string | null; isAdmin: boolean };

export type PersonalLinkMember = { actor: Actor; name: string; language: Locale | null };

export type MyEvents = { name: string; matches: CalendarMatch[] };

type MemberRow = { id: string; name: string; email: string | null; is_admin: number };

const toSummary = (r: MemberRow): MemberSummary => ({ id: r.id, name: r.name, email: r.email, isAdmin: r.is_admin === 1 });
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'cs');

export function membersModule(deps: { db: Database.Database; calendar: ReturnType<typeof calendarModule> }) {
	const { db, calendar } = deps;
	const rules = accessRules(db);

	const listByActive = (clubId: string, active: boolean) =>
		(
			db.prepare('SELECT id, name, email, is_admin FROM members WHERE club_id = ? AND active = ?').all(clubId, active ? 1 : 0) as MemberRow[]
		)
			.map(toSummary)
			.sort(byName);

	/** The member, if they belong to the club (active or not); NotFoundError otherwise. */
	function memberOfClub(clubId: string, memberId: string) {
		const m = rules.member(memberId);
		if (!m || m.club_id !== clubId) throw new NotFoundError('No such member in this club');
		return m;
	}

	/** Trimmed name and normalised email, checked: a name is required, and an email belongs to one member. */
	function validDetails(clubId: string, input: { name: string; email?: string | null }, memberId?: string) {
		const name = input.name.trim().replace(/\s+/g, ' ');
		if (!name) throw new InvalidInputError('nameRequired');
		const email = input.email?.trim() ? normaliseEmail(input.email) : null;
		if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new InvalidInputError('emailInvalid');
		if (email) {
			const taken = db
				.prepare('SELECT id FROM members WHERE club_id = ? AND email = ? AND id IS NOT ?')
				.get(clubId, email, memberId ?? null);
			if (taken) throw new InvalidInputError('emailTaken');
		}
		return { name, email };
	}

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
			const { name, email } = validDetails(clubId, input);
			const id = randomUUID();
			db.prepare('INSERT INTO members (id, club_id, name, email, link_token) VALUES (?, ?, ?, ?, ?)').run(
				id,
				clubId,
				name,
				email,
				newSecret()
			);
			return { id, name, email, isAdmin: false };
		},

		/** Changes a member's name and email. Admins only. */
		updateMember(actor: Actor | undefined, clubId: string, memberId: string, input: { name: string; email?: string | null }): void {
			rules.requireAdmin(actor, clubId);
			memberOfClub(clubId, memberId);
			const { name, email } = validDetails(clubId, input, memberId);
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
			const text = translator(opts.locale)('personalLink.message', { name: m.name.split(' ')[0], club: club.name, link: url });
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

		/** What the member sees when they open their link: the club's upcoming matches. */
		myUpcomingEvents(actor: Actor | undefined, clubId: string): MyEvents {
			const me = rules.requireMember(actor, clubId);
			return { name: me.name, matches: calendar.listMatches(clubId) };
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
		savedLanguage(device: { linkToken?: string; sessionToken?: string }): Locale | null {
			const fromLink =
				device.linkToken &&
				(db.prepare('SELECT language FROM members WHERE link_token = ? AND active = 1').get(device.linkToken) as
					| { language: string | null }
					| undefined);
			if (fromLink && isLocale(fromLink.language)) return fromLink.language;
			const fromSession =
				device.sessionToken &&
				(db
					.prepare('SELECT m.language FROM sessions s JOIN members m ON m.id = s.member_id WHERE s.token_hash = ? AND m.active = 1')
					.get(hashSecret(device.sessionToken)) as { language: string | null } | undefined);
			return fromSession && isLocale(fromSession.language) ? fromSession.language : null;
		},

		/** The member's saved language, if any. */
		memberLanguage(memberId: string): Locale | null {
			const row = db.prepare('SELECT language FROM members WHERE id = ?').get(memberId) as { language: string | null } | undefined;
			return isLocale(row?.language) ? row.language : null;
		}
	};
}
