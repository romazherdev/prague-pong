import { describe, expect, it } from 'vitest';
import { createTestCore } from './testing';

describe('listUpcomingMatches', () => {
	it("lists the club's matches from today onwards, soonest first", () => {
		// 2026-11-10 15:00 in Prague
		const { core, seed } = createTestCore({ now: '2026-11-10T14:00:00Z' });
		const club = seed.club({ name: 'Mladí Veteráni' });
		const teamA = seed.team({ clubId: club.id, name: 'A' });
		const juliska = seed.venue({ name: 'Pod Juliskou', address: 'Pod Juliskou 4, Praha 6' });

		seed.match({ clubId: club.id, teamId: teamA.id, venueId: juliska.id, opponent: 'Sokol Řepy', isHome: true, startsAt: '2026-11-17T17:00:00Z' });
		seed.match({ clubId: club.id, teamId: teamA.id, venueId: juliska.id, opponent: 'Yesterday FC', isHome: true, startsAt: '2026-11-09T17:00:00Z' });
		seed.match({ clubId: club.id, teamId: teamA.id, venueId: juliska.id, opponent: 'Earlier Today', isHome: false, startsAt: '2026-11-10T08:00:00Z' });

		const matches = core.listUpcomingMatches(club.id);

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

		expect(core.listUpcomingMatches(club.id)).toEqual([]);
	});

	it("does not show another club's matches", () => {
		const { core, seed } = createTestCore({ now: '2026-11-10T14:00:00Z' });
		const mine = seed.club({ name: 'Mine' });
		const other = seed.club({ name: 'Other' });
		const venue = seed.venue({ name: 'V', address: 'X' });
		const otherTeam = seed.team({ clubId: other.id, name: 'A' });
		seed.match({ clubId: other.id, teamId: otherTeam.id, venueId: venue.id, opponent: 'Z', isHome: true, startsAt: '2026-11-17T17:00:00Z' });

		expect(core.listUpcomingMatches(mine.id)).toEqual([]);
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
