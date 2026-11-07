import { openDatabase } from '../db/open';
import { seedBuilders } from '../db/seed-builders';
import { createClubCore } from './club-core';
import type { Clock, Email, Mailer, NotificationIntent, Notifier } from './ports';

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

/** Records every email instead of sending it. */
export function fakeMailer() {
	const sent: Email[] = [];
	return { sent, send: (email: Email) => void sent.push(email) } satisfies Mailer & { sent: Email[] };
}

/** The shared harness: club core over an in-memory SQLite database, a fixed clock, a fake notifier and a fake mailer. */
export function createTestCore(opts: { now: string }) {
	const db = openDatabase(':memory:');
	const clock = fixedClock(opts.now);
	const notifier = fakeNotifier();
	const mailer = fakeMailer();
	const core = createClubCore({ db, clock, notifier, mailer });
	return { core, clock, notifier, mailer, seed: seedBuilders(db) };
}
