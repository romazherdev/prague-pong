import { databasePath, openDatabase } from './db/open';
import { createClubCore, type ClubCore } from './core/club-core';
import { systemClock } from './core/ports';

let core: ClubCore | undefined;

/** The club core used by the running app, over the database at DATABASE_PATH. */
export function appCore(): ClubCore {
	if (!core) {
		core = createClubCore({
			db: openDatabase(databasePath()),
			clock: systemClock,
			// Real delivery (web push) arrives in ticket 12.
			notifier: { send: (intent) => console.info('[notify]', intent.kind, intent.recipientMemberId) }
		});
	}
	return core;
}

export const LANGUAGE_COOKIE = 'lang';
export const defaultClubSlug = () => process.env.DEFAULT_CLUB_SLUG ?? 'mladi-veterani';
