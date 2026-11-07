export interface Clock {
	now(): Date;
}

/** Something the core wants a person to know about. Delivery (push, etc.) is the notifier's job. */
export type NotificationIntent = { kind: string; recipientMemberId: string; data: Record<string, unknown> };

export interface Notifier {
	send(intent: NotificationIntent): void;
}

export const systemClock: Clock = { now: () => new Date() };
