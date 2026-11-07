import { describe, expect, it } from 'vitest';
import { createTestCore } from './testing';

describe('listMatches: upcoming by default', () => {
	it("lists the club's matches from today onwards, soonest first", () => {
		// 2026-11-10 15:00 in Prague
		const { core, seed } = createTestCore({ now: '2026-11-10T14:00:00Z' });
		const club = seed.club({ name: 'Mladí Veteráni' });
		const teamA = seed.team({ clubId: club.id, name: 'A' });
		const juliska = seed.venue({ name: 'Pod Juliskou', address: 'Pod Juliskou 4, Praha 6' });

		seed.match({ clubId: club.id, teamId: teamA.id, venueId: juliska.id, opponent: 'Sokol Řepy', isHome: true, startsAt: '2026-11-17T17:00:00Z' });
		seed.match({ clubId: club.id, teamId: teamA.id, venueId: juliska.id, opponent: 'Yesterday FC', isHome: true, startsAt: '2026-11-09T17:00:00Z' });
		seed.match({ clubId: club.id, teamId: teamA.id, venueId: juliska.id, opponent: 'Earlier Today', isHome: false, startsAt: '2026-11-10T08:00:00Z' });

		const matches = core.listMatches(club.id);

		expect(matches.map((m) => m.opponent)).toEqual(['Earlier Today', 'Sokol Řepy']);
		expect(matches[1]).toEqual({
			id: expect.any(String),
			team: { id: teamA.id, name: 'A' },
			opponent: 'Sokol Řepy',
			isHome: true,
			venue: { name: 'Pod Juliskou', address: 'Pod Juliskou 4, Praha 6' },
			startsAt: '2026-11-17T17:00:00Z'
		});
	});

	it("uses the club's local date: 00:30 in Prague is still the previous UTC day", () => {
		// 2026-11-11 00:30 Prague = 2026-11-10 23:30 UTC
		const { core, seed } = createTestCore({ now: '2026-11-10T23:30:00Z' });
		const club = seed.club({ name: 'C' });
		const team = seed.team({ clubId: club.id, name: 'A' });
		const venue = seed.venue({ name: 'V', address: 'X' });
		// 2026-11-10 20:00 Prague — the previous local day, so it is past
		seed.match({ clubId: club.id, teamId: team.id, venueId: venue.id, opponent: 'Last night', isHome: true, startsAt: '2026-11-10T19:00:00Z' });

		expect(core.listMatches(club.id)).toEqual([]);
	});

	it("does not show another club's matches", () => {
		const { core, seed } = createTestCore({ now: '2026-11-10T14:00:00Z' });
		const mine = seed.club({ name: 'Mine' });
		const other = seed.club({ name: 'Other' });
		const venue = seed.venue({ name: 'V', address: 'X' });
		const otherTeam = seed.team({ clubId: other.id, name: 'A' });
		seed.match({ clubId: other.id, teamId: otherTeam.id, venueId: venue.id, opponent: 'Z', isHome: true, startsAt: '2026-11-17T17:00:00Z' });

		expect(core.listMatches(mine.id)).toEqual([]);
	});
});

describe('findClubBySlug', () => {
	it('finds a club by its URL slug', () => {
		const { core, seed } = createTestCore({ now: '2026-11-10T14:00:00Z' });
		const club = seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });

		expect(core.findClubBySlug('mladi-veterani')).toEqual({ id: club.id, name: 'Mladí Veteráni', slug: 'mladi-veterani', timeZone: 'Europe/Prague' });
		expect(core.findClubBySlug('nope')).toBeUndefined();
	});
});

describe('createClub', () => {
	it('creates a club that can then be found by slug, in Prague time by default', () => {
		const { core } = createTestCore({ now: '2026-11-10T14:00:00Z' });

		const club = core.createClub({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });

		expect(core.findClubBySlug('mladi-veterani')).toEqual({ ...club, timeZone: 'Europe/Prague' });
	});

	it('refuses a slug that is already taken', () => {
		const { core } = createTestCore({ now: '2026-11-10T14:00:00Z' });
		core.createClub({ name: 'A', slug: 'same' });

		expect(() => core.createClub({ name: 'B', slug: 'same' })).toThrow();
	});
});

describe('listMatches: calendar views', () => {
	// 2026-11-10 15:00 in Prague
	const arrange = () => {
		const { core, seed, clock } = createTestCore({ now: '2026-11-10T14:00:00Z' });
		const club = seed.club({ name: 'Mladí Veteráni' });
		const teamA = seed.team({ clubId: club.id, name: 'A' });
		const teamB = seed.team({ clubId: club.id, name: 'B' });
		const venue = seed.venue({ name: 'Pod Juliskou', address: 'Pod Juliskou 4, Praha 6' });
		const match = (teamId: string, opponent: string, startsAt: string) =>
			seed.match({ clubId: club.id, teamId, venueId: venue.id, opponent, isHome: true, startsAt });
		return { core, seed, clock, club, teamA, teamB, match };
	};

	it("shows only one team's matches when filtered to that team", () => {
		const { core, club, teamA, teamB, match } = arrange();
		match(teamA.id, 'A next week', '2026-11-17T17:00:00Z');
		match(teamB.id, 'B next week', '2026-11-18T17:00:00Z');
		match(teamA.id, 'A in two weeks', '2026-11-24T17:00:00Z');

		expect(core.listMatches(club.id, { teamId: teamB.id }).map((m) => m.opponent)).toEqual(['B next week']);
		expect(core.listMatches(club.id).map((m) => m.opponent)).toEqual(['A next week', 'B next week', 'A in two weeks']);
	});

	it('hides past matches by default and shows them, oldest first, on request', () => {
		const { core, club, teamA, match } = arrange();
		match(teamA.id, 'Last week', '2026-11-03T17:00:00Z');
		match(teamA.id, 'Next week', '2026-11-17T17:00:00Z');

		expect(core.listMatches(club.id).map((m) => m.opponent)).toEqual(['Next week']);
		expect(core.listMatches(club.id, { includePast: true }).map((m) => m.opponent)).toEqual(['Last week', 'Next week']);
	});

	it('lets the clock decide what is past: a match drops out the day after it is played', () => {
		const { core, clock, club, teamA, match } = arrange();
		match(teamA.id, 'Tuesday 18:00', '2026-11-17T17:00:00Z');

		clock.set('2026-11-17T21:30:00Z'); // 22:30 the same evening in Prague
		expect(core.listMatches(club.id).map((m) => m.opponent)).toEqual(['Tuesday 18:00']);

		clock.set('2026-11-17T23:30:00Z'); // 00:30 the next day in Prague
		expect(core.listMatches(club.id)).toEqual([]);
	});
});

describe('listTeams', () => {
	it("lists the club's teams by name, without other clubs' teams", () => {
		const { core, seed } = createTestCore({ now: '2026-11-10T14:00:00Z' });
		const club = seed.club({ name: 'Mine' });
		const other = seed.club({ name: 'Other' });
		const c = seed.team({ clubId: club.id, name: 'C' });
		const a = seed.team({ clubId: club.id, name: 'A' });
		seed.team({ clubId: other.id, name: 'B' });

		expect(core.listTeams(club.id)).toEqual([
			{ id: a.id, name: 'A' },
			{ id: c.id, name: 'C' }
		]);
	});
});

describe('getMatch', () => {
	it('returns everything needed to get to a match, including past ones', () => {
		const { core, seed } = createTestCore({ now: '2026-11-10T14:00:00Z' });
		const club = seed.club({ name: 'Mladí Veteráni' });
		const team = seed.team({ clubId: club.id, name: 'B' });
		const venue = seed.venue({ name: 'TJ Sokol Řepy', address: 'Žufanova 1113/3, Praha 6 - Řepy' });
		const upcoming = seed.match({
			clubId: club.id,
			teamId: team.id,
			venueId: venue.id,
			opponent: 'TJ Sokol Řepy C',
			isHome: false,
			startsAt: '2026-11-18T17:00:00Z',
			endsAt: '2026-11-18T20:00:00Z',
			competition: '6TMA'
		});
		const past = seed.match({ clubId: club.id, teamId: team.id, venueId: venue.id, opponent: 'Old', isHome: true, startsAt: '2026-10-01T16:00:00Z' });

		expect(core.getMatch(club.id, upcoming.id)).toEqual({
			id: upcoming.id,
			team: { id: team.id, name: 'B' },
			opponent: 'TJ Sokol Řepy C',
			isHome: false,
			venue: { name: 'TJ Sokol Řepy', address: 'Žufanova 1113/3, Praha 6 - Řepy' },
			startsAt: '2026-11-18T17:00:00Z',
			endsAt: '2026-11-18T20:00:00Z',
			competition: '6TMA'
		});
		expect(core.getMatch(club.id, past.id)).toMatchObject({ opponent: 'Old', endsAt: null, competition: null });
	});

	it("does not return another club's match", () => {
		const { core, seed } = createTestCore({ now: '2026-11-10T14:00:00Z' });
		const mine = seed.club({ name: 'Mine' });
		const other = seed.club({ name: 'Other' });
		const team = seed.team({ clubId: other.id, name: 'A' });
		const venue = seed.venue({ name: 'V', address: 'X' });
		const theirs = seed.match({ clubId: other.id, teamId: team.id, venueId: venue.id, opponent: 'Z', isHome: true, startsAt: '2026-11-17T17:00:00Z' });

		expect(core.getMatch(mine.id, theirs.id)).toBeUndefined();
		expect(core.getMatch(mine.id, 'no-such-id')).toBeUndefined();
	});
});
