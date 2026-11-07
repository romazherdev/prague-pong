import { databasePath, openDatabase } from './db/open';
import { createClubCore, type ClubCore } from './core/club-core';
import { systemClock } from './core/ports';
import { createMailer } from './mailer';

let core: ClubCore | undefined;

/** The club core used by the running app, over the database at DATABASE_PATH. */
export function appCore(): ClubCore {
	if (!core) {
		core = createClubCore({
			db: openDatabase(databasePath()),
			clock: systemClock,
			// Real delivery (web push) arrives in ticket 12.
			notifier: { send: (intent) => console.info('[notify]', intent.kind, intent.recipientMemberId) },
			mailer: createMailer()
		});
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
