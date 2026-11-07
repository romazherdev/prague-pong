import { describe, expect, it } from 'vitest';
import type { Actor } from './access';
import { createTestCore } from './testing';

function setup() {
	const harness = createTestCore({ now: '2026-11-10T14:00:00Z' });
	const { seed, core } = harness;
	const club = seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
	const teamA = seed.team({ clubId: club.id, name: 'A' });
	const venue = seed.venue({ name: 'V', address: 'X' });
	const match = seed.match({ clubId: club.id, teamId: teamA.id, venueId: venue.id, opponent: 'Sokol', isHome: true, startsAt: '2026-11-17T17:00:00Z' });
	const admin = seed.member({ clubId: club.id, name: 'Admin', isAdmin: true });
	const asAdmin: Actor = { via: 'session', memberId: admin.id };
	const member = (name: string) => {
		const m = seed.member({ clubId: club.id, name, teamId: teamA.id });
		return { ...m, link: { via: 'personal-link', memberId: m.id } as Actor, session: { via: 'session', memberId: m.id } as Actor };
	};
	const captain = member('Kapitán');
	core.setCaptain(asAdmin, club.id, teamA.id, captain.id);
	const petr = member('Petr');
	core.recordResponse(petr.link, club.id, match.id, 'yes');
	core.setLineup(captain.session, club.id, match.id, [petr.id, captain.id]);
	harness.clock.set('2026-11-11T09:00:00Z'); // later answers come after the line-up was picked
	return { ...harness, club, teamA, venue, match, admin, asAdmin, member, captain, petr };
}

describe('a line-up player drops out', () => {
	it('their spot shows as open; they stay listed until the captain replaces or removes them', () => {
		const { core, club, match, captain, petr } = setup();

		core.recordResponse(petr.link, club.id, match.id, 'no');

		const view = core.lineupView(captain.session, club.id, match.id);
		expect(view.spotsOpen).toEqual([{ id: petr.id, name: 'Petr' }]);
		expect(view.lineup.map((p) => p.name)).toEqual(['Kapitán', 'Petr']);
	});

	it("sends the team's captain a spot-open notification intent", () => {
		const { core, club, match, captain, petr, notifier } = setup();

		core.recordResponse(petr.link, club.id, match.id, 'no');

		expect(notifier.sent).toEqual([
			{ kind: 'spotOpen', recipientMemberId: captain.id, data: { matchId: match.id, memberId: petr.id, memberName: 'Petr' } }
		]);
	});

	it('notifies only on the change to no, not when the answer was already no or for players outside the line-up', () => {
		const { core, club, match, petr, member, notifier } = setup();
		const outsider = member('Outsider');

		core.recordResponse(petr.link, club.id, match.id, 'no');
		core.recordResponse(petr.link, club.id, match.id, 'no');
		core.recordResponse(outsider.link, club.id, match.id, 'no');

		expect(notifier.sent).toHaveLength(1);
	});

	it('notifies the admins when the team has no captain', () => {
		const { core, club, match, petr, teamA, asAdmin, admin, notifier } = setup();
		core.setCaptain(asAdmin, club.id, teamA.id, null);

		core.recordResponse(petr.link, club.id, match.id, 'no');

		expect(notifier.sent.map((n) => n.recipientMemberId)).toEqual([admin.id]);
	});

	it("doesn't notify a captain about their own drop-out", () => {
		const { core, club, match, captain, notifier, admin } = setup();

		core.recordResponse(captain.link, club.id, match.id, 'no');

		expect(notifier.sent.map((n) => n.recipientMemberId)).toEqual([admin.id]);
	});

	it('never swaps anyone in automatically', () => {
		const { core, club, match, captain, petr, member } = setup();
		const keen = member('Keen');
		core.recordResponse(keen.link, club.id, match.id, 'yes');

		core.recordResponse(petr.link, club.id, match.id, 'no');

		expect(core.lineupView(captain.session, club.id, match.id).lineup.map((p) => p.name)).toEqual(['Kapitán', 'Petr']);
	});

	it('changing back to yes clears the open spot', () => {
		const { core, club, match, captain, petr } = setup();
		core.recordResponse(petr.link, club.id, match.id, 'no');

		core.recordResponse(petr.link, club.id, match.id, 'yes');

		expect(core.lineupView(captain.session, club.id, match.id).spotsOpen).toEqual([]);
	});

	it('shows open spots in the calendar and in the captain list', () => {
		const { core, club, match, captain, petr } = setup();

		core.recordResponse(petr.link, club.id, match.id, 'no');

		expect(core.clubCalendar(club.id).matches.find((m) => m.id === match.id)?.spotsOpen).toBe(1);
		expect(core.captainMatches(captain.session, club.id)[0].spotsOpen).toBe(1);
	});

	it("isn't a drop-out when the captain picked someone who had already said no (that's a warning instead)", () => {
		const { core, club, match, captain, member, notifier } = setup();
		const pavel = member('Pavel');
		core.recordResponse(pavel.link, club.id, match.id, 'no');

		core.setLineup(captain.session, club.id, match.id, [pavel.id, captain.id]);

		const view = core.lineupView(captain.session, club.id, match.id);
		expect(view.spotsOpen).toEqual([]);
		expect(view.warnings.find((w) => w.memberId === pavel.id)?.answer).toBe('no');
		expect(notifier.sent).toEqual([]);
	});

	it('sends notifications only after the answer is saved, and a failing delivery does not undo the answer', () => {
		const { core, club, match, petr, notifier } = setup();
		notifier.send = () => {
			throw new Error('push service down');
		};

		expect(() => core.recordResponse(petr.link, club.id, match.id, 'no')).not.toThrow();
		expect(core.myResponse(petr.link, club.id, match.id)?.answer).toBe('no');
	});
});

