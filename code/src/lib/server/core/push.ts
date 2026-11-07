import type Database from 'better-sqlite3';
import { defaultLocale, isLocale } from '#lib/i18n/locales.js';
import { formatMatchTime, translator } from '#lib/i18n/messages.js';
import { accessRules, InvalidInputError, type Actor } from './access';
import type { calendarModule } from './calendar';
import type { Clock, NotificationIntent } from './ports';

/** A browser push subscription, as `PushSubscription.toJSON()` gives it. */
export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

/** What a device shows: title, text, and the page to open when tapped. */
export type NotificationContent = { title: string; body: string; url: string };

const isSubscription = (s: PushSubscriptionInput) =>
	typeof s?.endpoint === 'string' &&
	/^https:\/\//.test(s.endpoint) &&
	s.endpoint.length < 2000 &&
	typeof s.keys?.p256dh === 'string' &&
	typeof s.keys?.auth === 'string';

export function pushModule(deps: { db: Database.Database; clock: Clock; calendar: ReturnType<typeof calendarModule> }) {
	const { db, clock, calendar } = deps;
	const rules = accessRules(db);

	return {
		/** Turns push on for this device, for the device's member. A device belongs to one member at a time. */
		savePushSubscription(actor: Actor | undefined, clubId: string, subscription: PushSubscriptionInput): void {
			const me = rules.requireMember(actor, clubId);
			if (!isSubscription(subscription)) throw new InvalidInputError('pushSubscriptionInvalid');
			db.prepare(
				`INSERT INTO push_subscriptions (endpoint, member_id, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)
				 ON CONFLICT (endpoint) DO UPDATE SET member_id = excluded.member_id, p256dh = excluded.p256dh, auth = excluded.auth`
			).run(subscription.endpoint, me.id, subscription.keys.p256dh, subscription.keys.auth, clock.now().toISOString());
		},

		/** Turns push off for this device. Only the member's own devices. */
		removePushSubscription(actor: Actor | undefined, clubId: string, endpoint: string): void {
			const me = rules.requireMember(actor, clubId);
			db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND member_id = ?').run(endpoint, me.id);
		},

		/** The member's devices with push on, oldest first (for the notifier). */
		pushSubscriptionsOf(memberId: string): PushSubscriptionInput[] {
			const rows = db
				.prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE member_id = ? ORDER BY created_at, rowid')
				.all(memberId) as { endpoint: string; p256dh: string; auth: string }[];
			return rows.map((r) => ({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }));
		},

		/** For the notifier: the push service said this device is gone (expired or unsubscribed). */
		removeDeadPushSubscription(endpoint: string): void {
			db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
		},

		/** The notification for an intent, in the recipient's saved language (Czech if none). Null if unknown. */
		notificationContent(intent: NotificationIntent): NotificationContent | null {
			const recipient = db.prepare('SELECT club_id, language FROM members WHERE id = ?').get(intent.recipientMemberId) as
				| { club_id: string; language: string | null }
				| undefined;
			if (!recipient) return null;
			const locale = isLocale(recipient.language) ? recipient.language : defaultLocale;
			const t = translator(locale);
			const club = calendar.findClubById(recipient.club_id)!;

			if (intent.kind === 'spotOpen') {
				const data = intent.data as { matchId: string; memberName: string };
				const match = calendar.getMatch(club.id, data.matchId);
				if (!match) return null;
				return {
					title: t('spotOpen.title'),
					body: t('push.spotOpen.body', {
						name: data.memberName,
						match: `${t('match.team', { team: match.team.name })} ${t('match.versus', { opponent: match.opponent })}`,
						when: formatMatchTime(match.startsAt, locale, club.timeZone)
					}),
					url: `/${club.slug}/matches/${match.id}/lineup`
				};
			}
			return null;
		}
	};
}
