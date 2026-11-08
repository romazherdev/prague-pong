import { describe, expect, it } from 'vitest';
import type { Actor } from './access';
import { createTestCore } from './testing';

// Tue 10 Nov 2026; training Tue and Thu 18:00–20:00 (17:00–19:00 UTC)
function setup() {
	const harness = createTestCore({ now: '2026-11-10T10:00:00Z' });
	const { seed, core } = harness;
	const club = seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
	const teams = Object.fromEntries(['A', 'B', 'C', 'D'].map((n) => [n, seed.team({ clubId: club.id, name: n })]));
	const homeVenue = seed.venue({ name: 'Pod Juliskou', address: 'Pod Juliskou 4' });
	const away = seed.venue({ name: 'Away', address: 'Elsewhere' });
	const admin = seed.member({ clubId: club.id, name: 'Admin', isAdmin: true });
	const asAdmin: Actor = { via: 'session', memberId: admin.id };
	core.createTrainingRule(asAdmin, club.id, { weekdays: [2, 4], startTime: '18:00', endTime: '20:00', venueId: homeVenue.id });
	const match = (team: string, isHome: boolean, startsAt: string, endsAt?: string) =>
		seed.match({ clubId: club.id, teamId: teams[team].id, venueId: isHome ? homeVenue.id : away.id, opponent: `${team} opp`, isHome, startsAt, endsAt });
	const tuesday = () => core.listTrainingSessions(club.id)[0];
	return { ...harness, club, admin, asAdmin, match, tuesday };
}

describe('free tables for a training session', () => {
	it('all tables are free with no home match that evening', () => {
		const { tuesday, match } = setup();
		match('A', false, '2026-11-10T17:00:00Z'); // away matches don't take tables

		expect(tuesday()).toMatchObject({ freeTables: 8, tooFewTables: false });
	});

	it('one home match takes 3 tables', () => {
		const { tuesday, match } = setup();
		match('B', true, '2026-11-10T17:00:00Z', '2026-11-10T20:00:00Z');

		expect(tuesday()).toMatchObject({ freeTables: 5, tooFewTables: false });
	});

	it('two home matches leave 2 tables: still viable at the default minimum of 2, flagged at 3', () => {
		const { core, club, asAdmin, tuesday, match } = setup();
		match('B', true, '2026-11-10T17:00:00Z', '2026-11-10T20:00:00Z');
		match('D', true, '2026-11-10T17:30:00Z', '2026-11-10T20:30:00Z');

		expect(tuesday()).toMatchObject({ freeTables: 2, tooFewTables: false });
		core.updateClubSettings(asAdmin, club.id, { totalTables: 8, tablesPerHomeMatch: 3, minTrainingTables: 3 });
		expect(tuesday()).toMatchObject({ freeTables: 2, tooFewTables: true });
	});

	it('never goes below 0', () => {
		const { core, club, asAdmin, tuesday, match } = setup();
		core.updateClubSettings(asAdmin, club.id, { totalTables: 5, tablesPerHomeMatch: 3, minTrainingTables: 1 });
		match('B', true, '2026-11-10T17:00:00Z');
		match('D', true, '2026-11-10T17:00:00Z');

		expect(tuesday()).toMatchObject({ freeTables: 0, tooFewTables: true });
	});

	it("only counts home matches that overlap the session (a match without an end time counts as 3 hours)", () => {
		const { tuesday, match } = setup();
		match('A', true, '2026-11-10T13:00:00Z', '2026-11-10T16:00:00Z'); // 14:00–17:00, before training
		match('B', true, '2026-11-10T19:00:00Z'); // 20:00, as training ends
		match('C', true, '2026-11-10T14:30:00Z'); // 15:30, no end time: until 18:30, overlaps

		expect(tuesday()).toMatchObject({ freeTables: 5 });
	});

	it('follows a rescheduled match', () => {
		const { core, club, asAdmin, tuesday, match } = setup();
		const m = match('B', true, '2026-11-11T17:00:00Z', '2026-11-11T20:00:00Z');
		expect(tuesday().freeTables).toBe(8);

		core.rescheduleMatch(asAdmin, club.id, m.id, { startsLocal: '2026-11-10T18:00' });

		expect(tuesday().freeTables).toBe(5);
	});
});

describe('the warning in the calendar and on the session', () => {
	it('flags the calendar evening when free tables fall below the minimum', () => {
		const { core, club, asAdmin, tuesday, match } = setup();
		core.updateClubSettings(asAdmin, club.id, { totalTables: 8, tablesPerHomeMatch: 3, minTrainingTables: 3 });
		const b = match('B', true, '2026-11-10T17:00:00Z', '2026-11-10T20:00:00Z');
		const d = match('D', true, '2026-11-10T17:00:00Z', '2026-11-10T20:00:00Z');

		expect(core.clubCalendar(club.id).clashes).toEqual([
			{ kind: 'trainingTables', date: '2026-11-10', matchIds: [b.id, d.id], sessionId: tuesday().id, freeTables: 2, minTrainingTables: 3 }
		]);
	});

	it("doesn't warn about a cancelled session", () => {
		const { core, club, asAdmin, tuesday, match } = setup();
		core.updateClubSettings(asAdmin, club.id, { totalTables: 8, tablesPerHomeMatch: 3, minTrainingTables: 3 });
		match('B', true, '2026-11-10T17:00:00Z');
		match('D', true, '2026-11-10T17:00:00Z');

		core.cancelTrainingSession(asAdmin, club.id, tuesday().id);

		expect(core.clubCalendar(club.id).clashes).toEqual([]);
		expect(tuesday()).toMatchObject({ cancelled: true, tooFewTables: false });
	});

	it('the session page shows coming and free tables', () => {
		const { core, club, tuesday, match, seed } = setup();
		match('B', true, '2026-11-10T17:00:00Z');
		const petr = seed.member({ clubId: club.id, name: 'Petr' });
		core.recordTrainingResponse({ via: 'personal-link', memberId: petr.id }, club.id, tuesday().id, 'in');

		expect(core.trainingSession({ via: 'personal-link', memberId: petr.id }, club.id, tuesday().id)).toMatchObject({
			coming: 1,
			freeTables: 5
		});
	});
});
