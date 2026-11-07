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
export const defaultClubSlug = () => process.env.DEFAULT_CLUB_SLUG ?? 'mladi-veterani';
