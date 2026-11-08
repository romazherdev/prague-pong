import { describe, expect, it } from 'vitest';
import { ForbiddenError, InvalidInputError, NotFoundError, type Actor } from './access';
import { createTestCore } from './testing';

const ORIGIN = 'https://pong.example';

function setup() {
	const harness = createTestCore({ now: '2026-11-10T14:00:00Z' });
	const club = harness.seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
	const admin = harness.seed.member({ clubId: club.id, name: 'Jana', isAdmin: true });
	const asAdmin: Actor = { via: 'session', memberId: admin.id };
	return { ...harness, club, admin, asAdmin };
}

/** The token at the end of a personal link URL. */
const tokenOf = (url: string) => url.split('/').at(-1)!;

describe('listMembers', () => {
	it("lists the club's active members by name, for admins only", () => {
		const { core, club, seed, admin, asAdmin } = setup();
		const zdenek = seed.member({ clubId: club.id, name: 'Zdeněk' });
		const adam = seed.member({ clubId: club.id, name: 'Adam' });
		seed.member({ clubId: club.id, name: 'Left the club', active: false });

		expect(core.listMembers(asAdmin, club.id).map((m) => m.id)).toEqual([adam.id, admin.id, zdenek.id]);
		expect(() => core.listMembers({ via: 'personal-link', memberId: admin.id }, club.id)).toThrow(ForbiddenError);
	});
});

describe('addMember and personal links', () => {
	it('gives a new member a personal link that identifies them without a login', () => {
		const { core, club, asAdmin } = setup();

		const petr = core.addMember(asAdmin, club.id, { name: ' Petr Novák ', email: '' });
		const { url } = core.personalLinkMessage(asAdmin, club.id, petr.id, { origin: ORIGIN, locale: 'cs' });

		expect(url).toMatch(/^https:\/\/pong\.example\/mladi-veterani\/m\/[A-Za-z0-9_-]{40,}$/);
		expect(core.memberByPersonalLink(club.id, tokenOf(url))).toEqual({
			actor: { via: 'personal-link', memberId: petr.id },
			name: 'Petr Novák',
			language: null
		});
	});

	it('refuses an empty name and an email another member already has', () => {
		const { core, club, asAdmin } = setup();
		core.addMember(asAdmin, club.id, { name: 'Petr', email: 'petr@example.cz' });

		expect(() => core.addMember(asAdmin, club.id, { name: '  ' })).toThrow(InvalidInputError);
		expect(() => core.addMember(asAdmin, club.id, { name: 'Other Petr', email: 'PETR@example.cz' })).toThrow(InvalidInputError);
	});

	it("doesn't accept another club's personal link", () => {
		const { core, club, seed, asAdmin } = setup();
		const other = seed.club({ name: 'Other' });
		const petr = core.addMember(asAdmin, club.id, { name: 'Petr' });
		const { url } = core.personalLinkMessage(asAdmin, club.id, petr.id, { origin: ORIGIN, locale: 'cs' });

		expect(core.memberByPersonalLink(other.id, tokenOf(url))).toBeUndefined();
		expect(core.memberByPersonalLink(club.id, 'made-up')).toBeUndefined();
	});

	it('regenerating the link stops the old one working immediately', () => {
		const { core, club, asAdmin } = setup();
		const petr = core.addMember(asAdmin, club.id, { name: 'Petr' });
		const before = core.personalLinkMessage(asAdmin, club.id, petr.id, { origin: ORIGIN, locale: 'cs' }).url;

		core.regeneratePersonalLink(asAdmin, club.id, petr.id);
		const after = core.personalLinkMessage(asAdmin, club.id, petr.id, { origin: ORIGIN, locale: 'cs' }).url;

		expect(after).not.toBe(before);
		expect(core.memberByPersonalLink(club.id, tokenOf(before))).toBeUndefined();
		expect(core.memberByPersonalLink(club.id, tokenOf(after))?.name).toBe('Petr');
	});

	it('builds a private WhatsApp message with the link, in Czech or English', () => {
		const { core, club, asAdmin } = setup();
		const petr = core.addMember(asAdmin, club.id, { name: 'Petr' });

		const cs = core.personalLinkMessage(asAdmin, club.id, petr.id, { origin: ORIGIN, locale: 'cs' });
		const en = core.personalLinkMessage(asAdmin, club.id, petr.id, { origin: ORIGIN, locale: 'en' });

		expect(cs.text).toContain('Ahoj Petr');
		expect(cs.text).toContain(cs.url);
		expect(en.text).toContain('Hi Petr');
		expect(en.text).toContain(en.url);
	});

	it('only admins manage members and see personal links', () => {
		const { core, club, seed, admin } = setup();
		const captain = seed.member({ clubId: club.id, name: 'Captain' });
		const notAdmins: (Actor | undefined)[] = [
			undefined,
			{ via: 'personal-link', memberId: admin.id },
			{ via: 'session', memberId: captain.id }
		];
		for (const actor of notAdmins) {
			expect(() => core.addMember(actor, club.id, { name: 'X' })).toThrow(ForbiddenError);
			expect(() => core.regeneratePersonalLink(actor, club.id, captain.id)).toThrow(ForbiddenError);
			expect(() => core.personalLinkMessage(actor, club.id, captain.id, { origin: ORIGIN, locale: 'cs' })).toThrow(ForbiddenError);
		}
	});
});

describe('a personal link never grants captain or admin powers', () => {
	it('even for a member who is an admin and a captain', () => {
		const { core, club, seed, admin, asAdmin } = setup();
		const team = seed.team({ clubId: club.id, name: 'A' });
		core.setCaptain(asAdmin, club.id, team.id, admin.id);
		const { url } = core.personalLinkMessage(asAdmin, club.id, admin.id, { origin: ORIGIN, locale: 'cs' });
		const viaLink = core.memberByPersonalLink(club.id, tokenOf(url))!.actor;

		expect(viaLink.via).toBe('personal-link');
		expect(() => core.setCaptain(viaLink, club.id, team.id, null)).toThrow(ForbiddenError);
		expect(() => core.listMembers(viaLink, club.id)).toThrow(ForbiddenError);
		expect(() => core.addMember(viaLink, club.id, { name: 'X' })).toThrow(ForbiddenError);
	});
});

describe('updateMember and deactivateMember', () => {
	it('lets an admin edit a member, e.g. to give a captain the email they sign in with', () => {
		const { core, club, asAdmin, mailer, seed } = setup();
		const team = seed.team({ clubId: club.id, name: 'B' });
		const petr = core.addMember(asAdmin, club.id, { name: 'Petr' });

		core.updateMember(asAdmin, club.id, petr.id, { name: 'Petr Novák', email: 'Petr@Example.cz' });
		core.setCaptain(asAdmin, club.id, team.id, petr.id);
		core.requestSignIn(club.id, 'petr@example.cz', { origin: ORIGIN, locale: 'cs' });

		expect(core.listMembers(asAdmin, club.id).find((m) => m.id === petr.id)).toMatchObject({
			name: 'Petr Novák',
			email: 'petr@example.cz'
		});
		expect(mailer.sent).toHaveLength(1);
	});

	it('a deactivated member disappears from lists, loses their link and captaincy, and can be reactivated', () => {
		const { core, club, asAdmin, seed } = setup();
		const team = seed.team({ clubId: club.id, name: 'B' });
		const petr = core.addMember(asAdmin, club.id, { name: 'Petr' });
		core.setCaptain(asAdmin, club.id, team.id, petr.id);
		const { url } = core.personalLinkMessage(asAdmin, club.id, petr.id, { origin: ORIGIN, locale: 'cs' });

		core.deactivateMember(asAdmin, club.id, petr.id);

		expect(core.listMembers(asAdmin, club.id).map((m) => m.name)).toEqual(['Jana']);
		expect(core.listInactiveMembers(asAdmin, club.id).map((m) => m.name)).toEqual(['Petr']);
		expect(core.memberByPersonalLink(club.id, tokenOf(url))).toBeUndefined();
		expect(core.listTeamsWithCaptains(asAdmin, club.id)[0].captain).toBeNull();

		core.reactivateMember(asAdmin, club.id, petr.id);
		expect(core.memberByPersonalLink(club.id, tokenOf(url))?.name).toBe('Petr');
	});

	it('an admin cannot deactivate themselves', () => {
		const { core, club, admin, asAdmin } = setup();

		expect(() => core.deactivateMember(asAdmin, club.id, admin.id)).toThrow(InvalidInputError);
	});
});

describe('myUpcomingEvents', () => {
	it("shows a member the club's upcoming matches", () => {
		const { core, club, seed, asAdmin } = setup();
		const team = seed.team({ clubId: club.id, name: 'A' });
		const venue = seed.venue({ name: 'V', address: 'X' });
		seed.match({ clubId: club.id, teamId: team.id, venueId: venue.id, opponent: 'Next week', isHome: true, startsAt: '2026-11-17T17:00:00Z' });
		seed.match({ clubId: club.id, teamId: team.id, venueId: venue.id, opponent: 'Last week', isHome: true, startsAt: '2026-11-03T17:00:00Z' });
		const petr = core.addMember(asAdmin, club.id, { name: 'Petr' });

		const mine = core.myUpcomingEvents({ via: 'personal-link', memberId: petr.id }, club.id);

		expect(mine.matches.map((m) => m.opponent)).toEqual(['Next week']);
		expect(() => core.myUpcomingEvents(undefined, club.id)).toThrow(ForbiddenError);
	});
});

describe('getMember', () => {
	it('shows an admin one member, active or not, from their own club only', () => {
		const { core, club, seed, asAdmin } = setup();
		const other = seed.club({ name: 'Other' });
		const outsider = seed.member({ clubId: other.id, name: 'Outsider' });
		const petr = core.addMember(asAdmin, club.id, { name: 'Petr' });
		core.deactivateMember(asAdmin, club.id, petr.id);

		expect(core.getMember(asAdmin, club.id, petr.id)).toEqual({
			id: petr.id,
			name: 'Petr',
			email: null,
			isAdmin: false,
			team: null,
			active: false,
			stisPlayerId: null
		});
		expect(() => core.getMember(asAdmin, club.id, outsider.id)).toThrow(NotFoundError);
		expect(() => core.getMember({ via: 'personal-link', memberId: petr.id }, club.id, petr.id)).toThrow(ForbiddenError);
	});
});

describe('member language', () => {
	it("a member's saved language beats the device preference and the browser's language", () => {
		const { core, club, asAdmin } = setup();
		const petr = core.addMember(asAdmin, club.id, { name: 'Petr' });
		const linkToken = tokenOf(core.personalLinkMessage(asAdmin, club.id, petr.id, { origin: ORIGIN, locale: 'cs' }).url);

		core.setMyLanguage({ via: 'personal-link', memberId: petr.id }, club.id, 'en');

		expect(core.resolveLocale({ memberPreference: core.savedLanguage({ linkToken }), devicePreference: 'cs', acceptLanguage: 'cs' })).toBe('en');
		expect(core.resolveLocale({ memberPreference: null, devicePreference: 'cs', acceptLanguage: 'en' })).toBe('cs');
	});

	it("finds the device's member from the personal-link cookie or the session, and switching language saves to them", async () => {
		const { core, club, seed, asAdmin, mailer } = setup();
		const team = seed.team({ clubId: club.id, name: 'A' });
		const petr = core.addMember(asAdmin, club.id, { name: 'Petr', email: 'petr@example.cz' });
		core.setCaptain(asAdmin, club.id, team.id, petr.id);
		const linkToken = tokenOf(core.personalLinkMessage(asAdmin, club.id, petr.id, { origin: ORIGIN, locale: 'cs' }).url);
		await core.requestSignIn(club.id, 'petr@example.cz', { origin: ORIGIN, locale: 'cs' });
		const signInToken = /\/sign-in\/(\S+)/.exec(mailer.sent[0].text)![1];
		const { sessionToken } = core.signIn(club.id, signInToken)!;

		expect(core.savedLanguage({ linkToken })).toBeNull();
		core.saveLanguageForDevice({ linkToken }, 'en');
		expect(core.savedLanguage({ linkToken })).toBe('en');
		expect(core.savedLanguage({ sessionToken })).toBe('en');

		core.saveLanguageForDevice({ sessionToken }, 'cs');
		expect(core.savedLanguage({ linkToken })).toBe('cs');
		expect(core.savedLanguage({})).toBeNull();
	});

	it("without any saved preference: the browser's language, then Czech", () => {
		const { core } = setup();

		expect(core.resolveLocale({ memberPreference: null, acceptLanguage: 'en-US,en;q=0.9' })).toBe('en');
		expect(core.resolveLocale({ memberPreference: null, acceptLanguage: 'de' })).toBe('cs');
		expect(core.resolveLocale({})).toBe('cs');
	});
});

describe('myPersonalLinkToken', () => {
	it("is the actor's own link token, for the installed app to open with, from a personal link or a session", () => {
		const { core, club, asAdmin, admin } = setup();
		const petr = core.addMember(asAdmin, club.id, { name: 'Petr' });
		const petrToken = tokenOf(core.personalLinkMessage(asAdmin, club.id, petr.id, { origin: ORIGIN, locale: 'cs' }).url);
		const adminToken = tokenOf(core.personalLinkMessage(asAdmin, club.id, admin.id, { origin: ORIGIN, locale: 'cs' }).url);

		expect(core.myPersonalLinkToken({ via: 'personal-link', memberId: petr.id }, club.id)).toBe(petrToken);
		expect(core.myPersonalLinkToken(asAdmin, club.id)).toBe(adminToken);
		expect(() => core.myPersonalLinkToken(undefined, club.id)).toThrow(ForbiddenError);
	});
});

