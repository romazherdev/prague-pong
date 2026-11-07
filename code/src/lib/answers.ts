/** A member's answer to a match. Shared by the club core and the UI (no server code here). */
export const MATCH_ANSWERS = ['yes', 'maybe', 'no'] as const;
export type MatchAnswer = (typeof MATCH_ANSWERS)[number];
export const isMatchAnswer = (v: unknown): v is MatchAnswer => (MATCH_ANSWERS as readonly unknown[]).includes(v);

/** An answer as it counts now: after a reschedule, an old yes or maybe is "reconfirm"; no answer is null. */
export type EffectiveAnswer = MatchAnswer | 'reconfirm' | null;
export const effectiveAnswer = (answer: MatchAnswer | null, needsReconfirm: boolean): EffectiveAnswer =>
	needsReconfirm ? 'reconfirm' : answer;
