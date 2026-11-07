import { describe, expect, it } from 'vitest';
import { ForbiddenError, InvalidInputError, type Actor } from './access';
import { createTestCore } from './testing';

function setup() {
	const harness = createTestCore({ now: '2026-11-10T14:00:00Z' });
	const { seed, core } = harness;
	const club = seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
	const teamA = seed.team({ clubId: club.id, name: 'A' });
	const teamB = seed.team({ clubId: club.id, name: 'B' });
	const venue = seed.venue({ name: 'V', address: 'X' });
	// Tue 17 Nov 2026, 18:00–21:00 in Prague
	const match = seed.match({
		clubId: club.id, teamId: teamA.id, venueId: venue.id, opponent: 'Sokol', isHome: true,
		startsAt: '2026-11-17T17:00:00Z', endsAt: '2026-11-17T20:00:00Z'
	});
	const admin = seed.member({ clubId: club.id, name: 'Admin', isAdmin: true });
	const asAdmin: Actor = { via: 'session', memberId: admin.id };
	const member = (name: string, teamId: string | null) => {
		const m = seed.member({ clubId: club.id, name, teamId });
		return { ...m, link: { via: 'personal-link', memberId: m.id } as Actor, session: { via: 'session', memberId: m.id } as Actor };
	};
	const captain = member('Kapitán', teamA.id);
	core.setCaptain(asAdmin, club.id, teamA.id, captain.id);
	return { ...harness, club, teamA, teamB, venue, match, admin, asAdmin, member, captain };
}

describe('rescheduleMatch', () => {
	it("moves the match to a new local date and time, keeping its length", () => {
		const { core, club, match, captain } = setup();

		core.rescheduleMatch(captain.session, club.id, match.id, { startsLocal: '2026-11-19T19:30' });

		expect(core.getMatch(club.id, match.id)).toMatchObject({ startsAt: '2026-11-19T18:30:00Z', endsAt: '2026-11-19T21:30:00Z' });
	});

	it('turns every yes and maybe into "please reconfirm"; no answers stay as they are', () => {
		const { core, club, match, captain, member, teamA } = setup();
		const yes = member('Ano', teamA.id);
		const maybe = member('Možná', teamA.id);
		const no = member('Ne', teamA.id);
		core.recordResponse(yes.link, club.id, match.id, 'yes');
		core.recordResponse(maybe.link, club.id, match.id, 'maybe');
		core.recordResponse(no.link, club.id, match.id, 'no');

		core.rescheduleMatch(captain.session, club.id, match.id, { startsLocal: '2026-11-19T19:30' });

		const r = core.matchResponses(captain.session, club.id, match.id);
		expect(r.reconfirm.map((m) => [m.name, m.previousAnswer])).toEqual([
			['Ano', 'yes'],
			['Možná', 'maybe']
		]);
		expect(r.yes).toEqual([]);
		expect(r.maybe).toEqual([]);
		expect(r.no.map((m) => m.name)).toEqual(['Ne']);
	});

	it('a member sees "please reconfirm" in my events and answering again clears it', () => {
		const { core, club, match, captain, member, teamA } = setup();
		const petr = member('Petr', teamA.id);
		core.recordResponse(petr.link, club.id, match.id, 'yes');
		core.rescheduleMatch(captain.session, club.id, match.id, { startsLocal: '2026-11-19T19:30' });

		const before = core.myUpcomingEvents(petr.link, club.id);
		expect(before.matches[0]).toMatchObject({ myAnswer: 'yes', needsReconfirm: true });
		expect(before.toReconfirm).toBe(1);

		core.recordResponse(petr.link, club.id, match.id, 'yes');
		expect(core.myUpcomingEvents(petr.link, club.id).matches[0]).toMatchObject({ myAnswer: 'yes', needsReconfirm: false });
	});

	it('marks the line-up "needs attention" until the captain saves it again or marks it reviewed', () => {
		const { core, club, match, captain, member, teamA } = setup();
		const petr = member('Petr', teamA.id);
		core.recordResponse(petr.link, club.id, match.id, 'yes');
		core.setLineup(captain.session, club.id, match.id, [petr.id]);

		core.rescheduleMatch(captain.session, club.id, match.id, { startsLocal: '2026-11-19T19:30' });
		expect(core.lineupView(captain.session, club.id, match.id).needsAttention).toBe(true);
		expect(core.captainMatches(captain.session, club.id)[0].needsAttention).toBe(true);
		expect(core.captainMatches(captain.session, club.id)[0].answers).toEqual({ yes: 0, maybe: 0, no: 0, reconfirm: 1 });

		core.markLineupReviewed(captain.session, club.id, match.id);
		expect(core.lineupView(captain.session, club.id, match.id).needsAttention).toBe(false);

		core.rescheduleMatch(captain.session, club.id, match.id, { startsLocal: '2026-11-20T19:30' });
		core.setLineup(captain.session, club.id, match.id, [petr.id]);
		expect(core.lineupView(captain.session, club.id, match.id).needsAttention).toBe(false);
	});

	it('warns the captain about line-up players who still have to reconfirm', () => {
		const { core, club, match, captain, member, teamA } = setup();
		const petr = member('Petr', teamA.id);
		core.recordResponse(petr.link, club.id, match.id, 'yes');
		core.setLineup(captain.session, club.id, match.id, [petr.id]);

		core.rescheduleMatch(captain.session, club.id, match.id, { startsLocal: '2026-11-19T19:30' });

		expect(core.lineupView(captain.session, club.id, match.id).warnings).toEqual([{ memberId: petr.id, name: 'Petr', answer: 'reconfirm' }]);
	});

	it('changes nothing when the date and time stay the same', () => {
		const { core, club, match, captain, member, teamA } = setup();
		const petr = member('Petr', teamA.id);
		core.recordResponse(petr.link, club.id, match.id, 'yes');

		core.rescheduleMatch(captain.session, club.id, match.id, { startsLocal: '2026-11-17T18:00' });

		expect(core.matchResponses(captain.session, club.id, match.id).yes.map((m) => m.name)).toEqual(['Petr']);
	});

	it('recalculates clashes for the new date', () => {
		const { core, club, match, captain, asAdmin, seed, teamB, venue } = setup();
		core.updateClubSettings(asAdmin, club.id, { totalTables: 5, tablesPerHomeMatch: 3, minTrainingTables: 0 });
		seed.match({ clubId: club.id, teamId: teamB.id, venueId: venue.id, opponent: 'B', isHome: true, startsAt: '2026-11-19T17:00:00Z' });
		expect(core.clubCalendar(club.id).clashes).toEqual([]);

		core.rescheduleMatch(captain.session, club.id, match.id, { startsLocal: '2026-11-19T19:30' });

		expect(core.clubCalendar(club.id).clashes.map((c) => c.date)).toEqual(['2026-11-19']);
	});

	it("only the team's captain or an admin can move it, and not into the past", () => {
		const { core, club, match, captain, asAdmin, member, teamB } = setup();
		const other = member('Other', teamB.id);

		expect(() => core.rescheduleMatch(captain.link, club.id, match.id, { startsLocal: '2026-11-19T19:30' })).toThrow(ForbiddenError);
		expect(() => core.rescheduleMatch(other.session, club.id, match.id, { startsLocal: '2026-11-19T19:30' })).toThrow(ForbiddenError);
		expect(() => core.rescheduleMatch(asAdmin, club.id, match.id, { startsLocal: '2026-11-09T19:30' })).toThrow(InvalidInputError);
		expect(() => core.rescheduleMatch(asAdmin, club.id, match.id, { startsLocal: 'tomorrow' })).toThrow(InvalidInputError);
		expect(() => core.rescheduleMatch(asAdmin, club.id, match.id, { startsLocal: '2026-11-21T10:00' })).not.toThrow();
	});

	it("can't move a match that has already been played", () => {
		const { core, club, asAdmin, seed, teamA, venue } = setup();
		const old = seed.match({ clubId: club.id, teamId: teamA.id, venueId: venue.id, opponent: 'Old', isHome: true, startsAt: '2026-11-03T17:00:00Z' });

		expect(() => core.rescheduleMatch(asAdmin, club.id, old.id, { startsLocal: '2026-11-21T10:00' })).toThrow(InvalidInputError);
	});
});
