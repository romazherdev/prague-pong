import { openDatabase } from '../db/open';
import { seedBuilders } from '../db/seed-builders';
import { createClubCore } from './club-core';
import type { Clock, NotificationIntent, Notifier } from './ports';

/** A clock frozen at `now` that tests can move. */
export function fixedClock(now: string) {
	let current = new Date(now);
	return {
		now: () => new Date(current),
		set(iso: string) {
			current = new Date(iso);
		}
	} satisfies Clock & { set(iso: string): void };
}

/** Records every intent instead of delivering it. */
export function fakeNotifier() {
	const sent: NotificationIntent[] = [];
	return { sent, send: (intent: NotificationIntent) => void sent.push(intent) } satisfies Notifier & {
		sent: NotificationIntent[];
	};
}

/** The shared harness: club core over an in-memory SQLite database, a fixed clock and a fake notifier. */
export function createTestCore(opts: { now: string }) {
	const db = openDatabase(':memory:');
	const clock = fixedClock(opts.now);
	const notifier = fakeNotifier();
	const core = createClubCore({ db, clock, notifier });
	return { core, clock, notifier, seed: seedBuilders(db) };
}
