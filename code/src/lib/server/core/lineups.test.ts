import { describe, expect, it } from 'vitest';
import { ForbiddenError, InvalidInputError, NotFoundError, type Actor } from './access';
import { createTestCore } from './testing';

function setup() {
	const harness = createTestCore({ now: '2026-11-10T14:00:00Z' });
	const { seed, core } = harness;
	const club = seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
	const teamA = seed.team({ clubId: club.id, name: 'A' });
	const teamB = seed.team({ clubId: club.id, name: 'B' });
	const venue = seed.venue({ name: 'V', address: 'X' });
	const match = seed.match({ clubId: club.id, teamId: teamA.id, venueId: venue.id, opponent: 'Sokol', isHome: true, startsAt: '2026-11-17T17:00:00Z' });
	const admin = seed.member({ clubId: club.id, name: 'Admin', isAdmin: true });
	const asAdmin: Actor = { via: 'session', memberId: admin.id };
	const member = (name: string, teamId: string | null, active = true) => {
		const m = seed.member({ clubId: club.id, name, teamId, active });
		return { ...m, link: { via: 'personal-link', memberId: m.id } as Actor, session: { via: 'session', memberId: m.id } as Actor };
	};
	const captainA = member('Kapitán', teamA.id);
	core.setCaptain(asAdmin, club.id, teamA.id, captainA.id);
	return { ...harness, club, teamA, teamB, venue, match, admin, asAdmin, member, captainA };
}

describe('lineupView', () => {
	it("shows the captain everyone's availability: own team first, other teams marked as substitutes", () => {
		const { core, club, match, member, teamA, teamB, captainA } = setup();
		const petr = member('Petr', teamA.id);
		const zdena = member('Zdena', teamA.id);
		const eva = member('Eva', teamB.id);
		const karel = member('Karel', teamB.id);
		member('Gone', teamA.id, false);
		core.recordResponse(petr.link, club.id, match.id, 'yes');
		core.recordResponse(zdena.link, club.id, match.id, 'no');
		core.recordResponse(eva.link, club.id, match.id, 'maybe');

		const view = core.lineupView(captainA.session, club.id, match.id);

		expect(view.candidates.map((c) => [c.name, c.answer, c.fromOtherTeam])).toEqual([
			['Petr', 'yes', false],
			['Kapitán', null, false],
			['Zdena', 'no', false],
			['Eva', 'maybe', true],
			['Admin', null, true],
			['Karel', null, true]
		]);
		expect(view.lineup).toEqual([]);
		void karel;
	});

	it('is only for the match team\'s captain or an admin, signed in', () => {
		const { core, club, match, member, teamB, captainA, asAdmin } = setup();
		const captainB = member('Kapitán B', teamB.id);
		core.setCaptain(asAdmin, club.id, teamB.id, captainB.id);

		expect(() => core.lineupView(captainA.link, club.id, match.id)).toThrow(ForbiddenError);
		expect(() => core.lineupView(captainB.session, club.id, match.id)).toThrow(ForbiddenError);
		expect(core.lineupView(asAdmin, club.id, match.id).match.id).toBe(match.id);
	});
});

describe('setLineup', () => {
	it('records up to 4 active members from any team, in no particular order', () => {
		const { core, club, match, member, teamA, teamB, captainA } = setup();
		const players = [member('Petr', teamA.id), member('Adam', teamA.id), member('Eva', teamB.id), captainA];
		for (const p of players) core.recordResponse(p.link, club.id, match.id, 'yes');

		const result = core.setLineup(captainA.session, club.id, match.id, players.map((p) => p.id));

		expect(result.warnings).toEqual([]);
		const lineup = core.lineupView(captainA.session, club.id, match.id).lineup;
		expect(lineup.map((p) => p.name)).toEqual(['Adam', 'Eva', 'Kapitán', 'Petr']);
		expect(lineup.find((p) => p.name === 'Eva')?.fromOtherTeam).toBe(true);
	});

	it('warns, but still saves, when a picked player answered no or maybe or has not answered', () => {
		const { core, club, match, member, teamA, captainA } = setup();
		const no = member('Ne', teamA.id);
		const maybe = member('Možná', teamA.id);
		const silent = member('Mlčí', teamA.id);
		core.recordResponse(no.link, club.id, match.id, 'no');
		core.recordResponse(maybe.link, club.id, match.id, 'maybe');

		const result = core.setLineup(captainA.session, club.id, match.id, [no.id, maybe.id, silent.id]);

		expect(result.warnings).toEqual([
			{ memberId: silent.id, name: 'Mlčí', answer: null },
			{ memberId: maybe.id, name: 'Možná', answer: 'maybe' },
			{ memberId: no.id, name: 'Ne', answer: 'no' }
		]);
		expect(core.lineupView(captainA.session, club.id, match.id).lineup).toHaveLength(3);
	});

	it('replaces the previous line-up', () => {
		const { core, club, match, member, teamA, captainA } = setup();
		const petr = member('Petr', teamA.id);
		const adam = member('Adam', teamA.id);
		core.setLineup(captainA.session, club.id, match.id, [petr.id, adam.id]);

		core.setLineup(captainA.session, club.id, match.id, [adam.id]);

		expect(core.lineupView(captainA.session, club.id, match.id).lineup.map((p) => p.name)).toEqual(['Adam']);
	});

	it('refuses more than 4 players, duplicates, inactive members and members of other clubs', () => {
		const { core, club, match, member, teamA, captainA, seed } = setup();
		const five = ['1', '2', '3', '4', '5'].map((n) => member(n, teamA.id).id);
		const gone = member('Gone', teamA.id, false);
		const other = seed.club({ name: 'Other' });
		const outsider = seed.member({ clubId: other.id, name: 'Outsider' });

		expect(() => core.setLineup(captainA.session, club.id, match.id, five)).toThrow(InvalidInputError);
		expect(() => core.setLineup(captainA.session, club.id, match.id, [five[0], five[0]])).toThrow(InvalidInputError);
		expect(() => core.setLineup(captainA.session, club.id, match.id, [gone.id])).toThrow(NotFoundError);
		expect(() => core.setLineup(captainA.session, club.id, match.id, [outsider.id])).toThrow(NotFoundError);
	});

	it("only that team's captain or an admin can change it; an admin can act for any team", () => {
		const { core, club, match, member, teamB, captainA, asAdmin } = setup();
		const captainB = member('Kapitán B', teamB.id);
		core.setCaptain(asAdmin, club.id, teamB.id, captainB.id);

		expect(() => core.setLineup(captainB.session, club.id, match.id, [])).toThrow(ForbiddenError);
		expect(() => core.setLineup(captainA.link, club.id, match.id, [])).toThrow(ForbiddenError);
		expect(() => core.setLineup(asAdmin, club.id, match.id, [captainA.id])).not.toThrow();
	});

	it("can't be changed once the match is past", () => {
		const { core, club, captainA, seed, teamA, venue } = setup();
		const old = seed.match({ clubId: club.id, teamId: teamA.id, venueId: venue.id, opponent: 'Old', isHome: true, startsAt: '2026-11-03T17:00:00Z' });

		expect(() => core.setLineup(captainA.session, club.id, old.id, [captainA.id])).toThrow(InvalidInputError);
	});
});

describe('members see when they are in a line-up', () => {
	it('marks line-up matches in my upcoming events', () => {
		const { core, club, match, member, teamA, captainA } = setup();
		const petr = member('Petr', teamA.id);
		core.setLineup(captainA.session, club.id, match.id, [petr.id]);

		expect(core.myUpcomingEvents(petr.link, club.id).matches[0].inLineup).toBe(true);
		expect(core.myUpcomingEvents(captainA.link, club.id).matches[0].inLineup).toBe(false);
	});
});

describe('matchLineup', () => {
	it('shows any member who is playing', () => {
		const { core, club, match, member, teamA, teamB, captainA } = setup();
		const petr = member('Petr', teamA.id);
		const eva = member('Eva', teamB.id);
		core.setLineup(captainA.session, club.id, match.id, [petr.id, eva.id]);

		expect(core.matchLineup(petr.link, club.id, match.id)).toEqual([
			{ id: eva.id, name: 'Eva', fromOtherTeam: true },
			{ id: petr.id, name: 'Petr', fromOtherTeam: false }
		]);
		expect(() => core.matchLineup(undefined, club.id, match.id)).toThrow(ForbiddenError);
	});
});

describe('captainMatches', () => {
	it("lists the upcoming matches of the teams a captain leads (all teams for an admin), with line-up size", () => {
		const { core, club, match, member, teamA, teamB, captainA, asAdmin, seed, venue } = setup();
		seed.match({ clubId: club.id, teamId: teamB.id, venueId: venue.id, opponent: 'B match', isHome: false, startsAt: '2026-11-18T17:00:00Z' });
		const petr = member('Petr', teamA.id);
		core.setLineup(captainA.session, club.id, match.id, [petr.id, captainA.id]);

		expect(core.captainMatches(captainA.session, club.id).map((m) => [m.opponent, m.lineupSize])).toEqual([['Sokol', 2]]);
		expect(core.captainMatches(asAdmin, club.id).map((m) => m.opponent)).toEqual(['Sokol', 'B match']);
		expect(() => core.captainMatches(petr.session, club.id)).toThrow(ForbiddenError);
	});
});
