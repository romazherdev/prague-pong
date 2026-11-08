export interface Clock {
	now(): Date;
}

/** Something the core wants a person to know about. Delivery (push, etc.) is the notifier's job. */
/** Something the club core wants a member told. The notifier decides how (web push). */
export type NotificationIntent = {
	kind: 'spotOpen';
	recipientMemberId: string;
	/** A line-up player answered "no" (ticket 11). */
	data: { matchId: string; memberId: string; memberName: string };
};

export interface Notifier {
	send(intent: NotificationIntent): void | Promise<void>;
}

export const systemClock: Clock = { now: () => new Date() };

export type Email = { to: string; subject: string; text: string };

/** Sends email (sign-in links). Members' emails are only collected for admins and captains. */
export interface Mailer {
	send(email: Email): void | Promise<void>;
}
