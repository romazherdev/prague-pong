import { sendNotification } from 'web-push';
import type { ClubCore } from './core/club-core';
import type { NotificationIntent, Notifier } from './core/ports';
import type { PushSubscriptionInput } from './core/push';

/** Sends one payload to one device; throws with `statusCode` when the push service refuses. */
export type PushSender = (subscription: PushSubscriptionInput, payload: string) => Promise<void>;

/**
 * The real notifier: turns the core's intents into web-push messages for each of the recipient's devices.
 * Devices the push service reports as gone (404/410) are removed; other failures are logged.
 */
export function createWebPushNotifier(deps: { core: Pick<ClubCore, 'notificationContent' | 'pushSubscriptionsOf' | 'removeDeadPushSubscription'>; send: PushSender }): Notifier {
	const { core, send } = deps;
	return {
		async send(intent: NotificationIntent) {
			const content = core.notificationContent(intent);
			if (!content) return;
			const payload = JSON.stringify(content);
			await Promise.all(
				core.pushSubscriptionsOf(intent.recipientMemberId).map(async (subscription) => {
					try {
						await send(subscription, payload);
					} catch (e) {
						const status = (e as { statusCode?: number }).statusCode;
						if (status === 404 || status === 410) core.removeDeadPushSubscription(subscription.endpoint);
						else console.error('[push] sending failed', status, e);
					}
				})
			);
		}
	};
}

/** VAPID keys for web push: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT (mailto: or https: URL). */
export function vapidConfig(env: Record<string, string | undefined> = process.env) {
	const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = env;
	return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : undefined;
}

/** Sends through the `web-push` library with the app's VAPID keys. Messages live up to 12 hours. */
export function createVapidSender(vapid: NonNullable<ReturnType<typeof vapidConfig>>): PushSender {
	return async (subscription, payload) => {
		await sendNotification(subscription, payload, {
			vapidDetails: vapid,
			TTL: 12 * 60 * 60,
			urgency: 'high'
		});
	};
}
