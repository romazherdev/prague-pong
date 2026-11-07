import { describe, expect, it } from 'vitest';
import { ForbiddenError, type Actor } from './access';
import { createTestCore } from './testing';

function setup() {
	const harness = createTestCore({ now: '2026-11-10T14:00:00Z' });
	const club = harness.seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
	const admin = harness.core.setUpAdmin(club.id, { name: 'Jana Admin', email: 'Jana@Example.cz ' });
	return { ...harness, club, admin };
}

const ORIGIN = 'https://pong.example';

/** The sign-in link from the last email sent, and the token in it. */
function lastLink(mailer: { sent: { text: string }[] }) {
	const text = mailer.sent.at(-1)?.text ?? '';
	const link = /https:\/\/\S+/.exec(text)?.[0];
	if (!link) throw new Error(`No link in email: ${text}`);
	return { link, token: link.split('/').at(-1)! };
}

describe('setUpAdmin', () => {
	it('creates the first admin, who can then request a sign-in link', () => {
		const { core, club, mailer } = setup();

		core.requestSignIn(club.id, 'jana@example.cz', { origin: ORIGIN, locale: 'cs' });

		expect(mailer.sent).toHaveLength(1);
		expect(mailer.sent[0].to).toBe('jana@example.cz');
		expect(lastLink(mailer).link).toMatch(/^https:\/\/pong\.example\/mladi-veterani\/sign-in\/[A-Za-z0-9_-]{32,}$/);
	});

	it('makes an existing member with the same email an admin instead of adding a duplicate', () => {
		const { core, club, admin } = setup();

		const again = core.setUpAdmin(club.id, { name: 'Jana', email: 'jana@example.cz' });

		expect(again.id).toBe(admin.id);
	});
});

describe('requestSignIn', () => {
	it('sends nothing for an unknown email or a member who is neither admin nor captain', () => {
		const { core, club, seed, mailer } = setup();
		seed.member({ clubId: club.id, name: 'Pavel', email: 'pavel@example.cz' });

		core.requestSignIn(club.id, 'nobody@example.cz', { origin: ORIGIN, locale: 'cs' });
		core.requestSignIn(club.id, 'pavel@example.cz', { origin: ORIGIN, locale: 'cs' });

		expect(mailer.sent).toEqual([]);
	});

	it('sends at most 3 links per member in 15 minutes, so the form cannot flood an inbox', async () => {
		const { core, club, clock, mailer } = setup();
		for (let i = 0; i < 5; i++) await core.requestSignIn(club.id, 'jana@example.cz', { origin: ORIGIN, locale: 'cs' });
		expect(mailer.sent).toHaveLength(3);

		clock.set('2026-11-10T14:15:01Z');
		await core.requestSignIn(club.id, 'jana@example.cz', { origin: ORIGIN, locale: 'cs' });
		expect(mailer.sent).toHaveLength(4);
	});

	it('writes the email in the language the link was requested in', () => {
		const { core, club, mailer } = setup();

		core.requestSignIn(club.id, 'jana@example.cz', { origin: ORIGIN, locale: 'en' });

		expect(mailer.sent[0].subject).toMatch(/sign in/i);
	});
});

describe('signIn', () => {
	it('turns a sign-in link into a session for that member, once', () => {
		const { core, club, admin, mailer } = setup();
		core.requestSignIn(club.id, 'jana@example.cz', { origin: ORIGIN, locale: 'cs' });
		const { token } = lastLink(mailer);

		const session = core.signIn(club.id, token);

		expect(session).toEqual({ sessionToken: expect.any(String), memberId: admin.id });
		expect(core.signIn(club.id, token)).toBeUndefined();
	});

	it('refuses a link older than 15 minutes', () => {
		const { core, club, clock, mailer } = setup();
		core.requestSignIn(club.id, 'jana@example.cz', { origin: ORIGIN, locale: 'cs' });
		clock.set('2026-11-10T14:15:01Z');

		expect(core.signIn(club.id, lastLink(mailer).token)).toBeUndefined();
	});

	it("refuses another club's link and made-up tokens", () => {
		const { core, club, seed, mailer } = setup();
		const other = seed.club({ name: 'Other' });
		core.requestSignIn(club.id, 'jana@example.cz', { origin: ORIGIN, locale: 'cs' });

		expect(core.signIn(other.id, lastLink(mailer).token)).toBeUndefined();
		expect(core.signIn(club.id, 'made-up')).toBeUndefined();
	});
});

describe('sessions', () => {
	function signedIn() {
		const s = setup();
		s.core.requestSignIn(s.club.id, 'jana@example.cz', { origin: ORIGIN, locale: 'cs' });
		const session = s.core.signIn(s.club.id, lastLink(s.mailer).token)!;
		return { ...s, session };
	}

	it('a session carries the role: admin', () => {
		const { core, club, admin, session } = signedIn();

		expect(core.whoIsSignedIn(club.id, session.sessionToken)).toEqual({
			actor: { via: 'session', memberId: admin.id },
			name: 'Jana Admin',
			isAdmin: true,
			captainOf: []
		});
	});

	it('a session carries the role: captain of a specific team', () => {
		const { core, club, seed, session, mailer } = signedIn();
		const teamB = seed.team({ clubId: club.id, name: 'B' });
		const petr = seed.member({ clubId: club.id, name: 'Petr', email: 'petr@example.cz' });
		const asAdmin = core.whoIsSignedIn(club.id, session.sessionToken)!.actor;
		core.setCaptain(asAdmin, club.id, teamB.id, petr.id);

		core.requestSignIn(club.id, 'petr@example.cz', { origin: ORIGIN, locale: 'cs' });
		const petrSession = core.signIn(club.id, lastLink(mailer).token)!;

		expect(core.whoIsSignedIn(club.id, petrSession.sessionToken)).toMatchObject({
			isAdmin: false,
			captainOf: [{ id: teamB.id, name: 'B' }]
		});
	});

	it('ends at sign-out', () => {
		const { core, club, session } = signedIn();

		core.signOut(session.sessionToken);

		expect(core.whoIsSignedIn(club.id, session.sessionToken)).toBeUndefined();
	});

	it('ends after 60 days', () => {
		const { core, club, clock, session } = signedIn();

		clock.set('2027-01-09T13:59:00Z');
		expect(core.whoIsSignedIn(club.id, session.sessionToken)).toBeDefined();
		clock.set('2027-01-09T14:00:00Z');
		expect(core.whoIsSignedIn(club.id, session.sessionToken)).toBeUndefined();
	});

	it("is not valid for another club's pages", () => {
		const { core, seed, session } = signedIn();
		const other = seed.club({ name: 'Other' });

		expect(core.whoIsSignedIn(other.id, session.sessionToken)).toBeUndefined();
	});
});

describe('setCaptain', () => {
	it('lets an admin make a member captain of a team and remove the role again', () => {
		const { core, club, seed, admin } = setup();
		const teamA = seed.team({ clubId: club.id, name: 'A' });
		const petr = seed.member({ clubId: club.id, name: 'Petr' });
		const asAdmin: Actor = { via: 'session', memberId: admin.id };

		core.setCaptain(asAdmin, club.id, teamA.id, petr.id);
		expect(core.listTeamsWithCaptains(asAdmin, club.id)).toEqual([
			{ id: teamA.id, name: 'A', captain: { id: petr.id, name: 'Petr' } }
		]);

		core.setCaptain(asAdmin, club.id, teamA.id, null);
		expect(core.listTeamsWithCaptains(asAdmin, club.id)).toEqual([{ id: teamA.id, name: 'A', captain: null }]);
	});

	it('refuses anyone without an admin session: no session, a personal link, or a captain', () => {
		const { core, club, seed, admin } = setup();
		const teamA = seed.team({ clubId: club.id, name: 'A' });
		const petr = seed.member({ clubId: club.id, name: 'Petr' });
		core.setCaptain({ via: 'session', memberId: admin.id }, club.id, teamA.id, petr.id);

		const attempts: (Actor | undefined)[] = [
			undefined,
			{ via: 'personal-link', memberId: admin.id },
			{ via: 'session', memberId: petr.id }
		];
		for (const actor of attempts) {
			expect(() => core.setCaptain(actor, club.id, teamA.id, null)).toThrow(ForbiddenError);
			expect(() => core.listTeamsWithCaptains(actor, club.id)).toThrow(ForbiddenError);
		}
	});

	it("refuses an admin of another club, and teams or members from another club", () => {
		const { core, club, seed, admin } = setup();
		const other = seed.club({ name: 'Other' });
		const otherAdmin = core.setUpAdmin(other.id, { name: 'O', email: 'o@example.cz' });
		const teamA = seed.team({ clubId: club.id, name: 'A' });
		const otherTeam = seed.team({ clubId: other.id, name: 'A' });
		const outsider = seed.member({ clubId: other.id, name: 'Outsider' });
		const asAdmin: Actor = { via: 'session', memberId: admin.id };

		expect(() => core.setCaptain({ via: 'session', memberId: otherAdmin.id }, club.id, teamA.id, null)).toThrow(ForbiddenError);
		expect(() => core.setCaptain(asAdmin, club.id, otherTeam.id, null)).toThrow();
		expect(() => core.setCaptain(asAdmin, club.id, teamA.id, outsider.id)).toThrow();
	});
});
