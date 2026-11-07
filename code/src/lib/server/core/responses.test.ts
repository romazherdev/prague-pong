import { describe, expect, it } from 'vitest';
import { ForbiddenError, InvalidInputError, NotFoundError, type Actor } from './access';
import { createTestCore } from './testing';

function setup() {
	const harness = createTestCore({ now: '2026-11-10T14:00:00Z' });
	const { seed } = harness;
	const club = seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
	const teamA = seed.team({ clubId: club.id, name: 'A' });
	const teamB = seed.team({ clubId: club.id, name: 'B' });
	const venue = seed.venue({ name: 'V', address: 'X' });
	const match = seed.match({ clubId: club.id, teamId: teamA.id, venueId: venue.id, opponent: 'Sokol', isHome: true, startsAt: '2026-11-17T17:00:00Z' });
	const pastMatch = seed.match({ clubId: club.id, teamId: teamA.id, venueId: venue.id, opponent: 'Old', isHome: true, startsAt: '2026-11-03T17:00:00Z' });
	const member = (name: string, teamId: string | null, active = true) => {
		const m = seed.member({ clubId: club.id, name, teamId, active });
		return { ...m, actor: { via: 'personal-link', memberId: m.id } as Actor };
	};
	return { ...harness, club, teamA, teamB, venue, match, pastMatch, member };
}

describe('recordResponse', () => {
	it("a member answers yes, maybe or no, changes it any time, and the latest answer wins", () => {
		const { core, club, match, member, teamA } = setup();
		const petr = member('Petr', teamA.id);

		core.recordResponse(petr.actor, club.id, match.id, 'maybe');
		expect(core.myUpcomingEvents(petr.actor, club.id).matches[0].myAnswer).toBe('maybe');

		core.recordResponse(petr.actor, club.id, match.id, 'yes');
		expect(core.myUpcomingEvents(petr.actor, club.id).matches[0].myAnswer).toBe('yes');
	});

	it("a member can answer for another team's match, so captains know they can substitute", () => {
		const { core, club, match, member, teamB } = setup();
		const eva = member('Eva', teamB.id);

		core.recordResponse(eva.actor, club.id, match.id, 'yes');

		expect(core.matchResponses(eva.actor, club.id, match.id).yes.map((m) => m.name)).toEqual(['Eva']);
	});

	it('refuses answers to past matches, unknown matches, and visitors without a link', () => {
		const { core, club, pastMatch, match, member, teamA, seed } = setup();
		const petr = member('Petr', teamA.id);
		const other = seed.club({ name: 'Other' });

		expect(() => core.recordResponse(petr.actor, club.id, pastMatch.id, 'yes')).toThrow(InvalidInputError);
		expect(() => core.recordResponse(petr.actor, club.id, 'nope', 'yes')).toThrow(NotFoundError);
		expect(() => core.recordResponse(undefined, club.id, match.id, 'yes')).toThrow(ForbiddenError);
		expect(() => core.recordResponse(petr.actor, other.id, match.id, 'yes')).toThrow(ForbiddenError);
	});
});

describe('myResponse', () => {
	it("is the member's current answer to a match, or null", () => {
		const { core, club, match, member, teamA } = setup();
		const petr = member('Petr', teamA.id);

		expect(core.myResponse(petr.actor, club.id, match.id)).toBeNull();
		core.recordResponse(petr.actor, club.id, match.id, 'maybe');
		expect(core.myResponse(petr.actor, club.id, match.id)).toEqual({ answer: 'maybe', needsReconfirm: false });
	});
});

describe('myUpcomingEvents: unanswered', () => {
	it('marks the matches the member has not answered yet and counts them', () => {
		const { core, club, match, member, teamA, seed, venue } = setup();
		seed.match({ clubId: club.id, teamId: teamA.id, venueId: venue.id, opponent: 'Second', isHome: false, startsAt: '2026-11-24T17:00:00Z' });
		const petr = member('Petr', teamA.id);
		core.recordResponse(petr.actor, club.id, match.id, 'no');

		const mine = core.myUpcomingEvents(petr.actor, club.id);

		expect(mine.matches.map((m) => [m.opponent, m.myAnswer])).toEqual([
			['Sokol', 'no'],
			['Second', null]
		]);
		expect(mine.unansweredMyTeam).toBe(1);
	});
});

describe('matchResponses', () => {
	it("lists who said yes, maybe or no, and which active team members haven't answered", () => {
		const { core, club, match, member, teamA, teamB } = setup();
		const petr = member('Petr', teamA.id);
		const adam = member('Adam', teamA.id);
		const zdena = member('Zdena', teamA.id);
		member('Karel', teamA.id);
		member('Gone', teamA.id, false);
		const eva = member('Eva', teamB.id);
		member('Training only', null);
		core.recordResponse(petr.actor, club.id, match.id, 'yes');
		core.recordResponse(eva.actor, club.id, match.id, 'yes');
		core.recordResponse(adam.actor, club.id, match.id, 'maybe');
		core.recordResponse(zdena.actor, club.id, match.id, 'no');

		const r = core.matchResponses(petr.actor, club.id, match.id);

		expect(r.yes).toEqual([
			{ id: eva.id, name: 'Eva', team: { id: teamB.id, name: 'B' }, fromOtherTeam: true },
			{ id: petr.id, name: 'Petr', team: { id: teamA.id, name: 'A' }, fromOtherTeam: false }
		]);
		expect(r.maybe.map((m) => m.name)).toEqual(['Adam']);
		expect(r.no.map((m) => m.name)).toEqual(['Zdena']);
		expect(r.unanswered.map((m) => m.name)).toEqual(['Karel']);
	});

	it('leaves out members who left the club, even if they had answered', () => {
		const { core, club, match, member, teamA, seed } = setup();
		const petr = member('Petr', teamA.id);
		const admin = seed.member({ clubId: club.id, name: 'Admin', isAdmin: true });
		core.recordResponse(petr.actor, club.id, match.id, 'yes');

		core.deactivateMember({ via: 'session', memberId: admin.id }, club.id, petr.id);

		expect(core.matchResponses({ via: 'session', memberId: admin.id }, club.id, match.id).yes).toEqual([]);
	});

	it('is only for members of the club', () => {
		const { core, club, match } = setup();

		expect(() => core.matchResponses(undefined, club.id, match.id)).toThrow(ForbiddenError);
	});
});
