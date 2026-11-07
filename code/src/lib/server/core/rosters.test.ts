import { describe, expect, it } from 'vitest';
import { ForbiddenError, type Actor } from './access';
import type { RosterImport } from './rosters';
import { createTestCore } from './testing';

function setup() {
	const harness = createTestCore({ now: '2026-11-10T14:00:00Z' });
	const club = harness.seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
	const admin = harness.seed.member({ clubId: club.id, name: 'Jana Admin', isAdmin: true });
	const asAdmin: Actor = { via: 'session', memberId: admin.id };
	const teamA = harness.seed.team({ clubId: club.id, name: 'A' });
	const teamB = harness.seed.team({ clubId: club.id, name: 'B' });
	return { ...harness, club, admin, asAdmin, teamA, teamB };
}

// STIS lists players surname first.
const rosters: RosterImport[] = [
	{ teamName: 'A', players: [{ name: 'Novák Petr', stisPlayerId: '1001' }, { name: 'Dvořáková Eva', stisPlayerId: '1002' }] },
	{ teamName: 'B', players: [{ name: 'Černý Tomáš', stisPlayerId: '1003' }] }
];

describe('rosters: import and suggestions', () => {
	it('suggests the member with the same name, ignoring word order, case and accents', () => {
		const { core, club, asAdmin, seed } = setup();
		const petr = seed.member({ clubId: club.id, name: 'Petr Novák' });
		const eva = seed.member({ clubId: club.id, name: 'eva dvorakova' });

		const result = core.importRosters(asAdmin, club.id, rosters);
		const review = core.listRosterReview(asAdmin, club.id);

		expect(result).toEqual({ added: 3, unchanged: 0 });
		expect(review.map((e) => [e.teamName, e.playerName, e.suggestedMember?.id ?? null, e.confirmedMember])).toEqual([
			['A', 'Dvořáková Eva', eva.id, null],
			['A', 'Novák Petr', petr.id, null],
			['B', 'Černý Tomáš', null, null]
		]);
	});

	it('suggests nothing when two members share the name, and never an inactive member', () => {
		const { core, club, asAdmin, seed } = setup();
		seed.member({ clubId: club.id, name: 'Petr Novák' });
		seed.member({ clubId: club.id, name: 'Novák Petr' });
		seed.member({ clubId: club.id, name: 'Tomáš Černý', active: false });

		core.importRosters(asAdmin, club.id, rosters);

		expect(core.listRosterReview(asAdmin, club.id).map((e) => e.suggestedMember)).toEqual([null, null, null]);
	});

	it('refuses a roster for a team the club does not have, importing nothing', () => {
		const { core, club, asAdmin } = setup();

		expect(() => core.importRosters(asAdmin, club.id, [...rosters, { teamName: 'Z', players: [{ name: 'X Y' }] }])).toThrow(
			/team Z/
		);
		expect(core.listRosterReview(asAdmin, club.id)).toEqual([]);
	});

	it('is for admins only', () => {
		const { core, club, admin } = setup();
		const viaLink: Actor = { via: 'personal-link', memberId: admin.id };

		expect(() => core.importRosters(viaLink, club.id, rosters)).toThrow(ForbiddenError);
		expect(() => core.listRosterReview(viaLink, club.id)).toThrow(ForbiddenError);
	});
});

describe('rosters: confirming', () => {
	it('confirming a match links the member to the STIS player and puts them on the team', () => {
		const { core, club, asAdmin, seed, teamA } = setup();
		const petr = seed.member({ clubId: club.id, name: 'Petr Novák' });
		core.importRosters(asAdmin, club.id, rosters);
		const entry = core.listRosterReview(asAdmin, club.id).find((e) => e.playerName === 'Novák Petr')!;

		core.confirmRosterEntry(asAdmin, club.id, entry.id, { memberId: petr.id });

		expect(core.listRosterReview(asAdmin, club.id).find((e) => e.id === entry.id)?.confirmedMember).toEqual({ id: petr.id, name: 'Petr Novák' });
		expect(core.getMember(asAdmin, club.id, petr.id)).toMatchObject({ team: { id: teamA.id, name: 'A' }, stisPlayerId: '1001' });
	});

	it('can confirm a different member than suggested, or create a new member from the roster name', () => {
		const { core, club, asAdmin, seed, teamB } = setup();
		const someone = seed.member({ clubId: club.id, name: 'Tom Black' });
		core.importRosters(asAdmin, club.id, rosters);
		const [eva, , tomas] = core.listRosterReview(asAdmin, club.id);

		core.confirmRosterEntry(asAdmin, club.id, tomas.id, { memberId: someone.id });
		const created = core.confirmRosterEntry(asAdmin, club.id, eva.id, { newMember: true });

		expect(core.getMember(asAdmin, club.id, someone.id).team).toEqual({ id: teamB.id, name: 'B' });
		expect(core.getMember(asAdmin, club.id, created.memberId)).toMatchObject({ name: 'Eva Dvořáková', team: { name: 'A' } });
	});

	it('re-importing duplicates nothing and keeps confirmed links', () => {
		const { core, club, asAdmin, seed } = setup();
		const petr = seed.member({ clubId: club.id, name: 'Petr Novák' });
		core.importRosters(asAdmin, club.id, rosters);
		const entry = core.listRosterReview(asAdmin, club.id).find((e) => e.playerName === 'Novák Petr')!;
		core.confirmRosterEntry(asAdmin, club.id, entry.id, { memberId: petr.id });

		const again = core.importRosters(asAdmin, club.id, rosters);

		expect(again).toEqual({ added: 0, unchanged: 3 });
		expect(core.listRosterReview(asAdmin, club.id)).toHaveLength(3);
		expect(core.listRosterReview(asAdmin, club.id).find((e) => e.id === entry.id)?.confirmedMember?.id).toBe(petr.id);
		expect(core.listMembers(asAdmin, club.id).filter((m) => m.name === 'Petr Novák')).toHaveLength(1);
	});

	it('a player who moved team in STIS is updated on re-import, and their confirmed member follows', () => {
		const { core, club, asAdmin, seed, teamB } = setup();
		const petr = seed.member({ clubId: club.id, name: 'Petr Novák' });
		core.importRosters(asAdmin, club.id, rosters);
		const entry = core.listRosterReview(asAdmin, club.id).find((e) => e.playerName === 'Novák Petr')!;
		core.confirmRosterEntry(asAdmin, club.id, entry.id, { memberId: petr.id });

		core.importRosters(asAdmin, club.id, [{ teamName: 'B', players: [{ name: 'Novák Petr', stisPlayerId: '1001' }] }]);

		expect(core.getMember(asAdmin, club.id, petr.id).team?.id).toBe(teamB.id);
	});
});

describe('team assignment by hand', () => {
	it('an admin can put a member on a team, move them, or leave them without a team (training only)', () => {
		const { core, club, asAdmin, seed, teamA, teamB } = setup();
		const pavel = core.addMember(asAdmin, club.id, { name: 'Pavel' });

		expect(core.getMember(asAdmin, club.id, pavel.id).team).toBeNull();
		core.setMemberTeam(asAdmin, club.id, pavel.id, teamA.id);
		expect(core.getMember(asAdmin, club.id, pavel.id).team?.id).toBe(teamA.id);
		core.setMemberTeam(asAdmin, club.id, pavel.id, teamB.id);
		expect(core.listMembers(asAdmin, club.id).find((m) => m.id === pavel.id)?.team?.name).toBe('B');
		core.setMemberTeam(asAdmin, club.id, pavel.id, null);
		expect(core.getMember(asAdmin, club.id, pavel.id).team).toBeNull();

		void seed;
	});

	it("refuses another club's team, and non-admins", () => {
		const { core, club, asAdmin, seed, teamA } = setup();
		const other = seed.club({ name: 'Other' });
		const otherTeam = seed.team({ clubId: other.id, name: 'A' });
		const pavel = core.addMember(asAdmin, club.id, { name: 'Pavel' });

		expect(() => core.setMemberTeam(asAdmin, club.id, pavel.id, otherTeam.id)).toThrow();
		expect(() => core.setMemberTeam({ via: 'personal-link', memberId: pavel.id }, club.id, pavel.id, teamA.id)).toThrow(ForbiddenError);
	});
});

describe('my events know my team', () => {
	it("marks the member's own team's matches", () => {
		const { core, club, asAdmin, seed, teamA, teamB } = setup();
		const venue = seed.venue({ name: 'V', address: 'X' });
		seed.match({ clubId: club.id, teamId: teamA.id, venueId: venue.id, opponent: 'A match', isHome: true, startsAt: '2026-11-17T17:00:00Z' });
		seed.match({ clubId: club.id, teamId: teamB.id, venueId: venue.id, opponent: 'B match', isHome: true, startsAt: '2026-11-18T17:00:00Z' });
		const pavel = core.addMember(asAdmin, club.id, { name: 'Pavel' });
		core.setMemberTeam(asAdmin, club.id, pavel.id, teamB.id);

		const mine = core.myUpcomingEvents({ via: 'personal-link', memberId: pavel.id }, club.id);

		expect(mine.team).toEqual({ id: teamB.id, name: 'B' });
		expect(mine.matches.map((m) => [m.opponent, m.isMyTeam])).toEqual([
			['A match', false],
			['B match', true]
		]);
	});
});
