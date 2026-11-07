export interface Clock {
	now(): Date;
}

/** Something the core wants a person to know about. Delivery (push, etc.) is the notifier's job. */
export type NotificationIntent = { kind: string; recipientMemberId: string; data: Record<string, unknown> };

export interface Notifier {
	send(intent: NotificationIntent): void;
}

export const systemClock: Clock = { now: () => new Date() };

export type Email = { to: string; subject: string; text: string };

/** Sends email (sign-in links). Members' emails are only collected for admins and captains. */
export interface Mailer {
	send(email: Email): void | Promise<void>;
}
