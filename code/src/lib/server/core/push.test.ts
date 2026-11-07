import { describe, expect, it } from 'vitest';
import { ForbiddenError, type Actor } from './access';
import { createTestCore } from './testing';
import { createWebPushNotifier, type PushSender } from '../web-push-notifier';

const sub = (n: number) => ({ endpoint: `https://push.example/${n}`, keys: { p256dh: `p${n}`, auth: `a${n}` } });

function setup() {
	const harness = createTestCore({ now: '2026-11-10T14:00:00Z' });
	const { seed, core } = harness;
	const club = seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
	const teamA = seed.team({ clubId: club.id, name: 'A' });
	const venue = seed.venue({ name: 'V', address: 'X' });
	const match = seed.match({ clubId: club.id, teamId: teamA.id, venueId: venue.id, opponent: 'Sokol Řepy', isHome: true, startsAt: '2026-11-17T17:00:00Z' });
	const member = (name: string) => {
		const m = seed.member({ clubId: club.id, name, teamId: teamA.id });
		return { ...m, link: { via: 'personal-link', memberId: m.id } as Actor };
	};
	return { ...harness, club, match, member };
}

describe('push subscriptions', () => {
	it('a member turns push on for a device and off again; subscriptions are kept per member and device', () => {
		const { core, club, member } = setup();
		const petr = member('Petr');

		core.savePushSubscription(petr.link, club.id, sub(1));
		core.savePushSubscription(petr.link, club.id, sub(2));
		expect(core.pushSubscriptionsOf(petr.id).map((s) => s.endpoint)).toEqual([sub(1).endpoint, sub(2).endpoint]);

		core.removePushSubscription(petr.link, club.id, sub(1).endpoint);
		expect(core.pushSubscriptionsOf(petr.id).map((s) => s.endpoint)).toEqual([sub(2).endpoint]);
	});

	it('a device subscribed again (e.g. another member on the same phone) moves to that member', () => {
		const { core, club, member } = setup();
		const petr = member('Petr');
		const eva = member('Eva');

		core.savePushSubscription(petr.link, club.id, sub(1));
		core.savePushSubscription(eva.link, club.id, sub(1));

		expect(core.pushSubscriptionsOf(petr.id)).toEqual([]);
		expect(core.pushSubscriptionsOf(eva.id)).toHaveLength(1);
	});

	it("needs a member, and can only remove the member's own subscriptions", () => {
		const { core, club, member } = setup();
		const petr = member('Petr');
		const eva = member('Eva');
		core.savePushSubscription(petr.link, club.id, sub(1));

		expect(() => core.savePushSubscription(undefined, club.id, sub(2))).toThrow(ForbiddenError);
		core.removePushSubscription(eva.link, club.id, sub(1).endpoint);
		expect(core.pushSubscriptionsOf(petr.id)).toHaveLength(1);
	});
});

describe('notificationContent', () => {
	it("writes a spot-open notification in the recipient's language, linking to the line-up", () => {
		const { core, club, match, member } = setup();
		const captain = member('Kapitán');
		const intent = { kind: 'spotOpen', recipientMemberId: captain.id, data: { matchId: match.id, memberId: 'x', memberName: 'Petr' } };

		const cs = core.notificationContent(intent);
		core.setMyLanguage(captain.link, club.id, 'en');
		const en = core.notificationContent(intent);

		expect(cs).toEqual({
			title: 'Volné místo v sestavě',
			body: 'Petr nemůže hrát: Družstvo A vs Sokol Řepy, út 17. 11. 18:00',
			url: `/mladi-veterani/matches/${match.id}/lineup`
		});
		expect(en?.title).toBe('Spot open in the line-up');
		expect(en?.body).toContain("Petr can't play");
	});
});

describe('web-push notifier', () => {
	it("delivers an intent to each of the recipient's devices", async () => {
		const { core, club, match, member } = setup();
		const captain = member('Kapitán');
		core.savePushSubscription(captain.link, club.id, sub(1));
		core.savePushSubscription(captain.link, club.id, sub(2));
		const sent: { endpoint: string; payload: string }[] = [];
		const send: PushSender = async (subscription, payload) => void sent.push({ endpoint: subscription.endpoint, payload });

		await createWebPushNotifier({ core, send }).send({
			kind: 'spotOpen',
			recipientMemberId: captain.id,
			data: { matchId: match.id, memberId: 'x', memberName: 'Petr' }
		});

		expect(sent.map((s) => s.endpoint)).toEqual([sub(1).endpoint, sub(2).endpoint]);
		expect(JSON.parse(sent[0].payload)).toMatchObject({ title: 'Volné místo v sestavě' });
	});

	it('removes subscriptions the push service says are gone (404/410), keeps others', async () => {
		const { core, club, match, member } = setup();
		const captain = member('Kapitán');
		core.savePushSubscription(captain.link, club.id, sub(1));
		core.savePushSubscription(captain.link, club.id, sub(2));
		core.savePushSubscription(captain.link, club.id, sub(3));
		const send: PushSender = async (subscription) => {
			if (subscription.endpoint.endsWith('/1')) throw Object.assign(new Error('Gone'), { statusCode: 410 });
			if (subscription.endpoint.endsWith('/2')) throw Object.assign(new Error('Server error'), { statusCode: 500 });
		};

		await createWebPushNotifier({ core, send }).send({
			kind: 'spotOpen',
			recipientMemberId: captain.id,
			data: { matchId: match.id, memberId: 'x', memberName: 'Petr' }
		});

		expect(core.pushSubscriptionsOf(captain.id).map((s) => s.endpoint)).toEqual([sub(2).endpoint, sub(3).endpoint]);
	});
});
