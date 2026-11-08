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

/**
 * Hosts of the browser push services (Chrome/Android, Firefox, Safari/iOS, Edge). The server sends requests
 * to a subscription's endpoint, so anything else is refused: it could point the server at internal addresses.
 */
const PUSH_SERVICE_HOSTS = [/^fcm\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /\.notify\.windows\.com$/];

/** Each member keeps at most this many devices with push on; the oldest go first. */
export const MAX_PUSH_DEVICES = 10;

function isSubscription(s: unknown): s is PushSubscriptionInput {
	const sub = s as PushSubscriptionInput | null;
	if (typeof sub?.endpoint !== 'string' || sub.endpoint.length > 2000) return false;
	if (typeof sub.keys?.p256dh !== 'string' || typeof sub.keys?.auth !== 'string') return false;
	try {
		const url = new URL(sub.endpoint);
		return url.protocol === 'https:' && !url.port && PUSH_SERVICE_HOSTS.some((host) => host.test(url.hostname));
	} catch {
		return false;
	}
}

export function pushModule(deps: { db: Database.Database; clock: Clock; calendar: ReturnType<typeof calendarModule> }) {
	const { db, clock, calendar } = deps;
	const rules = accessRules(db);

	return {
		/**
		 * Turns push on for this device, for the device's member. A device belongs to one member at a time
		 * (subscribing again on a shared phone moves it). Only real push-service endpoints are accepted.
		 */
		savePushSubscription(actor: Actor | undefined, clubId: string, subscription: unknown): void {
			const me = rules.requireMember(actor, clubId);
			if (!isSubscription(subscription)) throw new InvalidInputError('pushSubscriptionInvalid');
			db.transaction(() => {
				db.prepare(
				`INSERT INTO push_subscriptions (endpoint, member_id, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)
				 ON CONFLICT (endpoint) DO UPDATE SET member_id = excluded.member_id, p256dh = excluded.p256dh, auth = excluded.auth`
			).run(subscription.endpoint, me.id, subscription.keys.p256dh, subscription.keys.auth, clock.now().toISOString());
				db.prepare(
					`DELETE FROM push_subscriptions WHERE member_id = ? AND endpoint NOT IN
					 (SELECT endpoint FROM push_subscriptions WHERE member_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?)`
				).run(me.id, me.id, MAX_PUSH_DEVICES);
			})();
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
				const data = intent.data;
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
