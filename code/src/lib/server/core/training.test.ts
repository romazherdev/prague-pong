import { describe, expect, it } from 'vitest';
import { ForbiddenError, InvalidInputError, type Actor } from './access';
import { createTestCore } from './testing';

const ORIGIN = 'https://pong.example';

// Tue 10 Nov 2026, 15:00 in Prague
function setup() {
	const harness = createTestCore({ now: '2026-11-10T14:00:00Z' });
	const { seed } = harness;
	const club = seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
	const teamA = seed.team({ clubId: club.id, name: 'A' });
	const hall = seed.venue({ name: 'Pod Juliskou', address: 'Pod Juliskou 4, Praha 6' });
	const admin = seed.member({ clubId: club.id, name: 'Admin', isAdmin: true });
	const asAdmin: Actor = { via: 'session', memberId: admin.id };
	const member = (name: string) => {
		const m = seed.member({ clubId: club.id, name, teamId: teamA.id });
		return { ...m, link: { via: 'personal-link', memberId: m.id } as Actor };
	};
	const tueThu = { weekdays: [2, 4], startTime: '18:00', endTime: '20:00', venueId: hall.id };
	return { ...harness, club, teamA, hall, admin, asAdmin, member, tueThu };
}

const dates = (sessions: { date: string }[]) => sessions.map((s) => s.date);

describe('training rules and generated sessions', () => {
	it('generates sessions for the next 8 weeks from a weekly rule, in club time', () => {
		const { core, club, asAdmin, tueThu } = setup();

		core.createTrainingRule(asAdmin, club.id, tueThu);
		const sessions = core.listTrainingSessions(club.id);

		expect(sessions).toHaveLength(16);
		expect(dates(sessions).slice(0, 3)).toEqual(['2026-11-10', '2026-11-12', '2026-11-17']);
		expect(sessions[0]).toMatchObject({ startsAt: '2026-11-10T17:00:00Z', endsAt: '2026-11-10T19:00:00Z', cancelled: false, coming: 0 });
		expect(sessions[0].venue).toEqual({ name: 'Pod Juliskou', address: 'Pod Juliskou 4, Praha 6' });
		expect(dates(sessions).at(-1)).toBe('2026-12-31');
	});

	it('keeps generating as time goes on, without duplicating sessions', () => {
		const { core, club, asAdmin, tueThu, clock } = setup();
		core.createTrainingRule(asAdmin, club.id, tueThu);
		core.listTrainingSessions(club.id);

		clock.set('2026-11-24T14:00:00Z');
		const later = core.listTrainingSessions(club.id);

		expect(dates(later)[0]).toBe('2026-11-24');
		expect(new Set(dates(later)).size).toBe(later.length);
		expect(dates(later).at(-1)).toBe('2027-01-14');
	});

	it('editing a rule moves future sessions; ending it removes sessions after the end date', () => {
		const { core, club, asAdmin, tueThu } = setup();
		const rule = core.createTrainingRule(asAdmin, club.id, tueThu);

		core.updateTrainingRule(asAdmin, club.id, rule.id, { ...tueThu, weekdays: [3], startTime: '19:00', endTime: '21:00' });
		const moved = core.listTrainingSessions(club.id);
		expect(dates(moved).slice(0, 2)).toEqual(['2026-11-11', '2026-11-18']);
		expect(moved[0].startsAt).toBe('2026-11-11T18:00:00Z');

		core.endTrainingRule(asAdmin, club.id, rule.id, '2026-11-20');
		expect(dates(core.listTrainingSessions(club.id))).toEqual(['2026-11-11', '2026-11-18']);
		expect(core.listTrainingRules(asAdmin, club.id)[0]).toMatchObject({ endsOn: '2026-11-20' });
	});

	it('refuses rules that make no sense, and non-admins', () => {
		const { core, club, asAdmin, tueThu, admin } = setup();

		expect(() => core.createTrainingRule(asAdmin, club.id, { ...tueThu, weekdays: [] })).toThrow(InvalidInputError);
		expect(() => core.createTrainingRule(asAdmin, club.id, { ...tueThu, weekdays: [8] })).toThrow(InvalidInputError);
		expect(() => core.createTrainingRule(asAdmin, club.id, { ...tueThu, startTime: '20:00', endTime: '18:00' })).toThrow(InvalidInputError);
		expect(() => core.createTrainingRule(asAdmin, club.id, { ...tueThu, startTime: '25:00' })).toThrow(InvalidInputError);
		expect(() => core.createTrainingRule({ via: 'personal-link', memberId: admin.id }, club.id, tueThu)).toThrow(ForbiddenError);
	});
});

describe('cancelling a session', () => {
	it('an admin cancels a single session; members see it as cancelled and can no longer answer', () => {
		const { core, club, asAdmin, tueThu, member } = setup();
		core.createTrainingRule(asAdmin, club.id, tueThu);
		const [, thursday] = core.listTrainingSessions(club.id);
		const petr = member('Petr');

		core.cancelTrainingSession(asAdmin, club.id, thursday.id);

		expect(core.listTrainingSessions(club.id)[1]).toMatchObject({ date: '2026-11-12', cancelled: true });
		expect(core.myUpcomingEvents(petr.link, club.id).trainings[1]).toMatchObject({ cancelled: true });
		expect(() => core.recordTrainingResponse(petr.link, club.id, thursday.id, 'in')).toThrow(InvalidInputError);
		expect(() => core.cancelTrainingSession(petr.link, club.id, thursday.id)).toThrow(ForbiddenError);
	});

	it('a cancelled session stays cancelled when the rule generates again, and can be restored', () => {
		const { core, club, asAdmin, tueThu } = setup();
		const rule = core.createTrainingRule(asAdmin, club.id, tueThu);
		const [, thursday] = core.listTrainingSessions(club.id);
		core.cancelTrainingSession(asAdmin, club.id, thursday.id);

		core.updateTrainingRule(asAdmin, club.id, rule.id, { ...tueThu, startTime: '17:30' });
		expect(core.listTrainingSessions(club.id)[1].cancelled).toBe(true);

		core.restoreTrainingSession(asAdmin, club.id, thursday.id);
		expect(core.listTrainingSessions(club.id)[1].cancelled).toBe(false);
	});
});

describe('training responses', () => {
	it('members tap in or out, the latest answer wins, and the session counts who is coming', () => {
		const { core, club, asAdmin, tueThu, member } = setup();
		core.createTrainingRule(asAdmin, club.id, tueThu);
		const [tuesday] = core.listTrainingSessions(club.id);
		const petr = member('Petr');
		const eva = member('Eva');

		core.recordTrainingResponse(petr.link, club.id, tuesday.id, 'in');
		core.recordTrainingResponse(eva.link, club.id, tuesday.id, 'in');
		core.recordTrainingResponse(eva.link, club.id, tuesday.id, 'out');

		expect(core.listTrainingSessions(club.id)[0].coming).toBe(1);
		expect(core.trainingSession(petr.link, club.id, tuesday.id)).toMatchObject({ coming: 1, comingNames: ['Petr'], myAnswer: 'in' });
		expect(core.myUpcomingEvents(eva.link, club.id).trainings[0]).toMatchObject({ myAnswer: 'out', coming: 1 });
	});

	it("doesn't count members who left the club", () => {
		const { core, club, asAdmin, tueThu, member } = setup();
		core.createTrainingRule(asAdmin, club.id, tueThu);
		const [tuesday] = core.listTrainingSessions(club.id);
		const petr = member('Petr');
		core.recordTrainingResponse(petr.link, club.id, tuesday.id, 'in');

		core.deactivateMember(asAdmin, club.id, petr.id);

		expect(core.listTrainingSessions(club.id)[0].coming).toBe(0);
	});
});

describe('getTrainingSession', () => {
	it("is public, and only finds the club's own sessions", () => {
		const { core, club, asAdmin, tueThu, seed } = setup();
		core.createTrainingRule(asAdmin, club.id, tueThu);
		const [tuesday] = core.listTrainingSessions(club.id);
		const other = seed.club({ name: 'Other' });

		expect(core.getTrainingSession(club.id, tuesday.id)).toMatchObject({ date: '2026-11-10', isPast: false });
		expect(core.getTrainingSession(other.id, tuesday.id)).toBeUndefined();
	});
});

describe('trainings in the club calendar', () => {
	it('appear alongside matches, on their evening', () => {
		const { core, club, asAdmin, tueThu } = setup();
		core.createTrainingRule(asAdmin, club.id, tueThu);

		const calendar = core.clubCalendar(club.id);

		expect(calendar.trainings.slice(0, 2).map((s) => [s.evening, s.coming])).toEqual([
			['2026-11-10', 0],
			['2026-11-12', 0]
		]);
	});
});

describe('training messages for WhatsApp', () => {
	it('builds a share message and a reminder with the count, linking to the session page, never a personal link', () => {
		const { core, club, asAdmin, tueThu, member } = setup();
		core.createTrainingRule(asAdmin, club.id, tueThu);
		const [tuesday] = core.listTrainingSessions(club.id);
		const petr = member('Petr');
		core.recordTrainingResponse(petr.link, club.id, tuesday.id, 'in');

		const share = core.trainingMessage(asAdmin, club.id, tuesday.id, 'share', { origin: ORIGIN, locale: 'cs' });
		const reminder = core.trainingMessage(asAdmin, club.id, tuesday.id, 'reminder', { origin: ORIGIN, locale: 'en' });

		expect(share).toBe(
			[
				'🏓 Trénink – úterý 10. listopadu 2026, 18:00–20:00',
				'📍 Pod Juliskou, Pod Juliskou 4, Praha 6',
				'',
				`Přijdete? Klepněte tady: ${ORIGIN}/mladi-veterani/trainings/${tuesday.id}`
			].join('\n')
		);
		expect(reminder).toContain('Coming so far: 1');
		expect(reminder).not.toMatch(/\/m\//);
		expect(() => core.trainingMessage(petr.link, club.id, tuesday.id, 'share', { origin: ORIGIN, locale: 'cs' })).toThrow(ForbiddenError);
	});
});

describe('clubVenues', () => {
	it("lists the venues the club plays at, home venue first, for the admin's training form", () => {
		const { core, club, asAdmin, hall, seed, teamA } = setup();
		const away = seed.venue({ name: 'Away hall', address: 'Somewhere' });
		seed.venue({ name: 'Unrelated', address: 'Elsewhere' });
		seed.match({ clubId: club.id, teamId: teamA.id, venueId: hall.id, opponent: 'X', isHome: true, startsAt: '2026-11-17T17:00:00Z' });
		seed.match({ clubId: club.id, teamId: teamA.id, venueId: away.id, opponent: 'Y', isHome: false, startsAt: '2026-11-18T17:00:00Z' });

		expect(core.clubVenues(asAdmin, club.id).map((v) => v.name)).toEqual(['Pod Juliskou', 'Away hall']);
	});
});

