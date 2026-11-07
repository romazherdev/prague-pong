import { describe, expect, it } from 'vitest';
import { ForbiddenError, InvalidInputError, type Actor } from './access';
import { createTestCore } from './testing';

function setup() {
	const harness = createTestCore({ now: '2026-11-10T14:00:00Z' });
	const { seed, core } = harness;
	const club = seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
	const teams = Object.fromEntries(['A', 'B', 'C', 'D'].map((n) => [n, seed.team({ clubId: club.id, name: n })]));
	const home = seed.venue({ name: 'Pod Juliskou', address: 'Pod Juliskou 4' });
	const away = seed.venue({ name: 'Away', address: 'Elsewhere' });
	const admin = seed.member({ clubId: club.id, name: 'Admin', isAdmin: true });
	const asAdmin: Actor = { via: 'session', memberId: admin.id };
	const match = (team: string, isHome: boolean, startsAt: string, opponent = `${team} ${startsAt}`) =>
		seed.match({ clubId: club.id, teamId: teams[team].id, venueId: isHome ? home.id : away.id, opponent, isHome, startsAt });
	return { ...harness, club, teams, admin, asAdmin, match, core };
}

describe('club settings', () => {
	it('defaults to 8 tables, 3 per home match, and 2 for viable training; an admin can change them', () => {
		const { core, club, asAdmin } = setup();

		expect(core.clubSettings(club.id)).toEqual({ totalTables: 8, tablesPerHomeMatch: 3, minTrainingTables: 2 });

		core.updateClubSettings(asAdmin, club.id, { totalTables: 7, tablesPerHomeMatch: 3, minTrainingTables: 1 });
		expect(core.clubSettings(club.id)).toEqual({ totalTables: 7, tablesPerHomeMatch: 3, minTrainingTables: 1 });
	});

	it('refuses nonsense numbers and non-admins', () => {
		const { core, club, asAdmin, admin } = setup();

		expect(() => core.updateClubSettings(asAdmin, club.id, { totalTables: 0, tablesPerHomeMatch: 3, minTrainingTables: 1 })).toThrow(InvalidInputError);
		expect(() => core.updateClubSettings(asAdmin, club.id, { totalTables: 8, tablesPerHomeMatch: 2.5, minTrainingTables: 1 })).toThrow(InvalidInputError);
		expect(() => core.updateClubSettings(asAdmin, club.id, { totalTables: 2, tablesPerHomeMatch: 3, minTrainingTables: 0 })).toThrow(InvalidInputError);
		expect(() => core.updateClubSettings(asAdmin, club.id, { totalTables: 8, tablesPerHomeMatch: 3, minTrainingTables: NaN })).toThrow(InvalidInputError);
		expect(() => core.clubSettingsForAdmin({ via: 'personal-link', memberId: admin.id }, club.id)).toThrow(ForbiddenError);
		expect(() =>
			core.updateClubSettings({ via: 'personal-link', memberId: admin.id }, club.id, { totalTables: 8, tablesPerHomeMatch: 3, minTrainingTables: 2 })
		).toThrow(ForbiddenError);
	});
});

describe('clash: home matches need more tables than the club has', () => {
	it('flags an evening whose home matches × tables per match exceed the total', () => {
		const { core, club, match, asAdmin } = setup();
		const b = match('B', true, '2026-11-11T18:00:00Z');
		const d = match('D', true, '2026-11-11T18:00:00Z');
		match('A', false, '2026-11-11T18:00:00Z');
		match('C', true, '2026-11-18T18:00:00Z');

		// 2 × 3 = 6 ≤ 8: fine by default
		expect(core.clubCalendar(club.id).clashes).toEqual([]);

		core.updateClubSettings(asAdmin, club.id, { totalTables: 5, tablesPerHomeMatch: 3, minTrainingTables: 2 });
		expect(core.clubCalendar(club.id).clashes).toEqual([
			{ kind: 'tooFewTables', date: '2026-11-11', matchIds: [b.id, d.id], homeMatches: 2, tablesNeeded: 6, totalTables: 5 }
		]);
	});

	it('uses the club\'s local evening: 00:30 Prague is a different evening than 23:30 UTC the day before', () => {
		const { core, club, match, asAdmin } = setup();
		core.updateClubSettings(asAdmin, club.id, { totalTables: 3, tablesPerHomeMatch: 3, minTrainingTables: 0 });
		match('B', true, '2026-11-11T17:00:00Z');
		match('D', true, '2026-11-11T23:30:00Z'); // 00:30 on the 12th in Prague

		expect(core.clubCalendar(club.id).clashes).toEqual([]);
	});
});

describe('clash: a member in two line-ups on the same evening', () => {
	it('flags the member and both matches', () => {
		const { core, club, match, asAdmin, seed } = setup();
		const petr = seed.member({ clubId: club.id, name: 'Petr' });
		const a = match('A', true, '2026-11-11T17:00:00Z');
		const c = match('C', false, '2026-11-11T19:00:00Z');
		const later = match('D', true, '2026-11-12T17:00:00Z');
		core.setLineup(asAdmin, club.id, a.id, [petr.id]);
		core.setLineup(asAdmin, club.id, c.id, [petr.id]);
		core.setLineup(asAdmin, club.id, later.id, [petr.id]);

		expect(core.clubCalendar(club.id, {}, asAdmin).clashes).toEqual([
			{ kind: 'doubleBooked', date: '2026-11-11', matchIds: [a.id, c.id], member: { id: petr.id, name: 'Petr' } }
		]);
	});

	it("isn't shown to visitors who aren't members, since it names a member", () => {
		const { core, club, match, asAdmin, seed } = setup();
		const petr = seed.member({ clubId: club.id, name: 'Petr' });
		const a = match('A', true, '2026-11-11T17:00:00Z');
		const c = match('C', false, '2026-11-11T19:00:00Z');
		core.setLineup(asAdmin, club.id, a.id, [petr.id]);
		core.setLineup(asAdmin, club.id, c.id, [petr.id]);

		expect(core.clubCalendar(club.id).clashes).toEqual([]);
		expect(core.clubCalendar(club.id, {}, { via: 'personal-link', memberId: petr.id }).clashes).toHaveLength(1);
	});

	it('ignores members who left the club', () => {
		const { core, club, match, asAdmin, seed } = setup();
		const petr = seed.member({ clubId: club.id, name: 'Petr' });
		const a = match('A', true, '2026-11-11T17:00:00Z');
		const c = match('C', false, '2026-11-11T19:00:00Z');
		core.setLineup(asAdmin, club.id, a.id, [petr.id]);
		core.setLineup(asAdmin, club.id, c.id, [petr.id]);

		core.deactivateMember(asAdmin, club.id, petr.id);

		expect(core.clubCalendar(club.id, {}, asAdmin).clashes).toEqual([]);
	});
});

describe('clubCalendar', () => {
	it('checks clashes across all teams even when the calendar is filtered to one team', () => {
		const { core, club, match, asAdmin, teams } = setup();
		core.updateClubSettings(asAdmin, club.id, { totalTables: 5, tablesPerHomeMatch: 3, minTrainingTables: 2 });
		const b = match('B', true, '2026-11-11T18:00:00Z');
		const d = match('D', true, '2026-11-11T18:00:00Z');

		const onlyB = core.clubCalendar(club.id, { teamId: teams.B.id });

		expect(onlyB.matches.map((m) => m.id)).toEqual([b.id]);
		expect(onlyB.clashes.map((c) => c.matchIds)).toEqual([[b.id, d.id]]);
	});

	it('leaves out past evenings unless past matches are shown', () => {
		const { core, club, match, asAdmin } = setup();
		core.updateClubSettings(asAdmin, club.id, { totalTables: 5, tablesPerHomeMatch: 3, minTrainingTables: 2 });
		match('B', true, '2026-11-04T18:00:00Z');
		match('D', true, '2026-11-04T18:00:00Z');

		expect(core.clubCalendar(club.id).clashes).toEqual([]);
		expect(core.clubCalendar(club.id, { includePast: true }).clashes).toHaveLength(1);
	});
});

describe('clubCalendar evenings', () => {
	it("gives each match its evening (the club's local date), so the calendar can group and flag whole evenings", () => {
		const { core, club, match } = setup();
		match('B', true, '2026-11-11T18:00:00Z');
		match('D', false, '2026-11-11T23:30:00Z'); // 00:30 on the 12th in Prague

		expect(core.clubCalendar(club.id).matches.map((m) => m.evening)).toEqual(['2026-11-11', '2026-11-12']);
	});
});

describe('the captain sees clashes on the affected match', () => {
	it('lineupView includes the clashes involving that match', () => {
		const { core, club, match, asAdmin, seed } = setup();
		const petr = seed.member({ clubId: club.id, name: 'Petr' });
		const a = match('A', true, '2026-11-11T17:00:00Z');
		const c = match('C', false, '2026-11-11T19:00:00Z');
		const other = match('B', true, '2026-11-20T17:00:00Z');
		core.setLineup(asAdmin, club.id, a.id, [petr.id]);
		core.setLineup(asAdmin, club.id, c.id, [petr.id]);

		expect(core.lineupView(asAdmin, club.id, a.id).clashes.map((x) => x.kind)).toEqual(['doubleBooked']);
		expect(core.lineupView(asAdmin, club.id, other.id).clashes).toEqual([]);
	});
});
