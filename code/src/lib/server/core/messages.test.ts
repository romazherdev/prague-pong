import { describe, expect, it } from 'vitest';
import { ForbiddenError, type Actor } from './access';
import { createTestCore } from './testing';

const ORIGIN = 'https://pong.example';

function setup() {
	const harness = createTestCore({ now: '2026-11-10T14:00:00Z' });
	const { seed, core } = harness;
	const club = seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
	const teamA = seed.team({ clubId: club.id, name: 'A' });
	const teamB = seed.team({ clubId: club.id, name: 'B' });
	const venue = seed.venue({ name: 'TJ Sokol Řepy', address: 'Žufanova 1113/3, Praha 6' });
	const match = seed.match({ clubId: club.id, teamId: teamA.id, venueId: venue.id, opponent: 'Sokol Řepy C', isHome: false, startsAt: '2026-11-17T17:00:00Z' });
	const admin = seed.member({ clubId: club.id, name: 'Admin', isAdmin: true });
	const asAdmin: Actor = { via: 'session', memberId: admin.id };
	const member = (name: string, teamId: string | null, active = true) => {
		const m = seed.member({ clubId: club.id, name, teamId, active });
		return { ...m, link: { via: 'personal-link', memberId: m.id } as Actor, session: { via: 'session', memberId: m.id } as Actor };
	};
	const captain = member('Karel Kapitán', teamA.id);
	core.setCaptain(asAdmin, club.id, teamA.id, captain.id);
	return { ...harness, club, teamA, teamB, venue, match, asAdmin, member, captain };
}

describe('matchMessage: reminder', () => {
	it("names the team's active members who haven't answered, with the match and its link", () => {
		const { core, club, match, member, teamA, teamB, captain } = setup();
		const petr = member('Petr Novák', teamA.id);
		member('Zdena Malá', teamA.id);
		member('Adam Černý', teamA.id);
		member('Odešel', teamA.id, false);
		member('Eva z B', teamB.id);
		core.recordResponse(petr.link, club.id, match.id, 'yes');
		core.recordResponse(captain.link, club.id, match.id, 'no');

		const text = core.matchMessage(captain.session, club.id, match.id, 'reminder', { origin: ORIGIN, locale: 'cs' });

		expect(text).toBe(
			[
				'🏓 Družstvo A vs Sokol Řepy C – úterý 17. listopadu 2026, 18:00 (venku)',
				'',
				'Ještě neodpověděli: Adam Černý, Zdena Malá',
				'',
				'Odpovězte prosím ve svém osobním odkazu, nebo tady:',
				`${ORIGIN}/mladi-veterani/matches/${match.id}`
			].join('\n')
		);
	});

	it('also asks those who have to confirm a moved match again', () => {
		const { core, club, match, member, teamA, captain } = setup();
		const petr = member('Petr Novák', teamA.id);
		core.recordResponse(petr.link, club.id, match.id, 'yes');
		core.recordResponse(captain.link, club.id, match.id, 'yes');
		core.rescheduleMatch(captain.session, club.id, match.id, { startsLocal: '2026-11-19T19:30' });

		const text = core.matchMessage(captain.session, club.id, match.id, 'reminder', { origin: ORIGIN, locale: 'en' });

		expect(text).toContain('Team A vs Sokol Řepy C – Thursday, 19 November 2026, 19:30 (away)');
		expect(text).toContain('Please confirm the new date: Karel Kapitán, Petr Novák');
		expect(text).not.toContain("haven't answered");
	});

	it('says everyone has answered when nobody is missing', () => {
		const { core, club, match, captain } = setup();
		core.recordResponse(captain.link, club.id, match.id, 'yes');

		expect(core.matchMessage(captain.session, club.id, match.id, 'reminder', { origin: ORIGIN, locale: 'cs' })).toContain(
			'Všichni z družstva už odpověděli.'
		);
	});
});

describe('matchMessage: share', () => {
	it('gives the match details and its public link, in Czech or English', () => {
		const { core, club, match, captain } = setup();

		const cs = core.matchMessage(captain.session, club.id, match.id, 'share', { origin: ORIGIN, locale: 'cs' });
		const en = core.matchMessage(captain.session, club.id, match.id, 'share', { origin: ORIGIN, locale: 'en' });

		expect(cs).toBe(
			[
				'🏓 Družstvo A vs Sokol Řepy C – úterý 17. listopadu 2026, 18:00 (venku)',
				'📍 TJ Sokol Řepy, Žufanova 1113/3, Praha 6',
				'',
				`Kdo může, ať odpoví: ${ORIGIN}/mladi-veterani/matches/${match.id}`
			].join('\n')
		);
		expect(en).toContain('📍 TJ Sokol Řepy, Žufanova 1113/3, Praha 6');
		expect(en).toContain('If you can play, answer here:');
	});
});

describe('messages are for the group chat', () => {
	it('never contain a personal link', () => {
		const { core, club, match, member, teamA, captain, asAdmin } = setup();
		const petr = member('Petr Novák', teamA.id);
		const tokens = [petr.id, captain.id].map((id) =>
			core.personalLinkMessage(asAdmin, club.id, id, { origin: ORIGIN, locale: 'cs' }).url.split('/').at(-1)!
		);

		for (const kind of ['reminder', 'share'] as const) {
			for (const locale of ['cs', 'en'] as const) {
				const text = core.matchMessage(captain.session, club.id, match.id, kind, { origin: ORIGIN, locale });
				expect(text).not.toMatch(/\/m\//);
				for (const token of tokens) expect(text).not.toContain(token);
			}
		}
	});

	it("are only for the match team's captain or an admin", () => {
		const { core, club, match, member, teamA, teamB, asAdmin } = setup();
		const petr = member('Petr Novák', teamA.id);
		const otherCaptain = member('Kapitán B', teamB.id);
		core.setCaptain(asAdmin, club.id, teamB.id, otherCaptain.id);

		expect(() => core.matchMessage(petr.link, club.id, match.id, 'share', { origin: ORIGIN, locale: 'cs' })).toThrow(ForbiddenError);
		expect(() => core.matchMessage(otherCaptain.session, club.id, match.id, 'share', { origin: ORIGIN, locale: 'cs' })).toThrow(ForbiddenError);
		expect(core.matchMessage(asAdmin, club.id, match.id, 'share', { origin: ORIGIN, locale: 'cs' })).toContain('Sokol Řepy C');
	});
});
