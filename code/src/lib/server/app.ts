import { databasePath, openDatabase } from './db/open';
import { createClubCore, type ClubCore } from './core/club-core';
import { systemClock, type Notifier } from './core/ports';
import { createMailer } from './mailer';
import { createVapidSender, createWebPushNotifier, vapidConfig } from './web-push-notifier';

let core: ClubCore | undefined;

/** The club core used by the running app, over the database at DATABASE_PATH. */
export function appCore(): ClubCore {
	if (!core) {
		const vapid = vapidConfig();
		// The notifier needs the core (subscriptions, texts) and the core needs the notifier: tie them late.
		let notifier: Notifier = { send: (intent) => console.info('[notify]', intent.kind, intent.recipientMemberId) };
		const created = createClubCore({
			db: openDatabase(databasePath()),
			clock: systemClock,
			notifier: { send: (intent) => notifier.send(intent) },
			mailer: createMailer()
		});
		if (vapid) notifier = createWebPushNotifier({ core: created, send: createVapidSender(vapid) });
		core = created;
	}
	return core;
}

export const LANGUAGE_COOKIE = 'lang';
/** Holds the session token of a signed-in admin or captain. */
export const SESSION_COOKIE = 'session';
/** Holds the member's personal-link token, so the app (and the installed PWA) knows who they are. */
export const MEMBER_COOKIE = 'member';
export const defaultClubSlug = () => process.env.DEFAULT_CLUB_SLUG ?? 'mladi-veterani';

/**
 * The public base URL for links the app sends out (sign-in emails). In production it must come from ORIGIN,
 * never from the request: otherwise a forged Host header could make a real email point to another site.
 */
export function publicOrigin(requestUrl: URL, env: Record<string, string | undefined> = process.env): string {
	if (env.ORIGIN) return env.ORIGIN.replace(/\/$/, '');
	if (env.NODE_ENV === 'production') throw new Error('Set ORIGIN to the public URL, e.g. https://pong.example');
	return requestUrl.origin;
}
