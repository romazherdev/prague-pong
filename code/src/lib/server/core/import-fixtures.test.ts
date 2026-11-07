import { describe, expect, it } from 'vitest';
import { createTestCore } from './testing';
import type { FixtureImport } from './club-core';

const juliska = { name: 'Herna SC ČVUT Juliska', address: 'Herna SC ČVUT Juliska, Praha 6, Pod Juliskou 4' };

const fixture = (overrides: Partial<FixtureImport>): FixtureImport => ({
	fixtureKey: '5TMB|TJ Mladí Veteráni - VSK ČVUT A|TTC Praha F',
	competition: '5TMB',
	teamName: 'A',
	opponent: 'TTC Praha F',
	isHome: true,
	venue: juliska,
	startsLocal: '2026-11-18T19:00',
	endsLocal: '2026-11-18T21:00',
	...overrides
});

function setup() {
	const harness = createTestCore({ now: '2026-11-07T12:00:00Z' });
	const club = harness.seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
	return { ...harness, club };
}

describe('importSeasonFixtures', () => {
	it("adds the season's matches to the club calendar, creating teams as needed", () => {
		const { core, club } = setup();

		const result = core.importSeasonFixtures(club.id, [
			fixture({}),
			fixture({
				fixtureKey: '7TMA|SK Start Praha D|TJ Mladí Veteráni - VSK ČVUT D',
				competition: '7TMA',
				teamName: 'D',
				opponent: 'SK Start Praha D',
				isHome: false,
				venue: { name: 'Střelecký ostrov', address: 'Střelecký ostrov, Praha 1' },
				startsLocal: '2027-04-21T19:00',
				endsLocal: '2027-04-21T21:00'
			})
		]);

		expect(result).toEqual({ added: 2, updated: 0, unchanged: 0, changedNotApplied: [] });
		const matches = core.listMatches(club.id);
		expect(matches.map((m) => [m.team.name, m.opponent, m.isHome, m.venue.name])).toEqual([
			['A', 'TTC Praha F', true, 'Herna SC ČVUT Juliska'],
			['D', 'SK Start Praha D', false, 'Střelecký ostrov']
		]);
	});

	it('converts Prague wall-clock times to UTC across daylight saving time', () => {
		const { core, club } = setup();

		core.importSeasonFixtures(club.id, [
			fixture({ fixtureKey: 'winter', startsLocal: '2026-11-18T19:00' }), // CET, UTC+1
			fixture({ fixtureKey: 'summer', startsLocal: '2027-04-14T19:00' }) // CEST, UTC+2
		]);

		expect(core.listMatches(club.id).map((m) => m.startsAt)).toEqual([
			'2026-11-18T18:00:00Z',
			'2027-04-14T17:00:00Z'
		]);
	});

	it('is safe to run again: the same file adds nothing', () => {
		const { core, club } = setup();
		const season = [fixture({}), fixture({ fixtureKey: 'other', opponent: 'TJ Pankrác F' })];

		core.importSeasonFixtures(club.id, season);
		const again = core.importSeasonFixtures(club.id, season);

		expect(again).toEqual({ added: 0, updated: 0, unchanged: 2, changedNotApplied: [] });
		expect(core.listMatches(club.id)).toHaveLength(2);
	});

	it('reports a fixture moved in STIS without applying it, so answers are never silently kept for a new date', () => {
		const { core, club } = setup();
		core.importSeasonFixtures(club.id, [fixture({})]);

		const result = core.importSeasonFixtures(club.id, [
			fixture({ startsLocal: '2026-11-25T19:00', endsLocal: '2026-11-25T21:00' })
		]);

		expect(result).toEqual({
			added: 0,
			updated: 0,
			unchanged: 0,
			changedNotApplied: ['5TMB|TJ Mladí Veteráni - VSK ČVUT A|TTC Praha F']
		});
		expect(core.listMatches(club.id).map((m) => m.startsAt)).toEqual(['2026-11-18T18:00:00Z']);
	});

	it('applies moved fixtures when asked to, instead of duplicating them', () => {
		const { core, club } = setup();
		core.importSeasonFixtures(club.id, [fixture({})]);

		const result = core.importSeasonFixtures(
			club.id,
			[fixture({ startsLocal: '2026-11-25T19:00', endsLocal: '2026-11-25T21:00' })],
			{ applyChanges: true }
		);

		expect(result).toMatchObject({ added: 0, updated: 1, changedNotApplied: [] });
		expect(core.listMatches(club.id).map((m) => m.startsAt)).toEqual(['2026-11-25T18:00:00Z']);
	});

	it("keeps each club's fixtures separate even with the same key", () => {
		const { core, seed, club } = setup();
		const other = seed.club({ name: 'Other' });

		core.importSeasonFixtures(club.id, [fixture({})]);
		core.importSeasonFixtures(other.id, [fixture({})]);

		expect(core.listMatches(club.id)).toHaveLength(1);
		expect(core.listMatches(other.id)).toHaveLength(1);
	});

	it('imports nothing if any fixture is invalid', () => {
		const { core, club } = setup();

		expect(() =>
			core.importSeasonFixtures(club.id, [fixture({}), fixture({ fixtureKey: 'bad', startsLocal: 'not a date' })])
		).toThrow();
		expect(core.listMatches(club.id)).toEqual([]);
	});
});
