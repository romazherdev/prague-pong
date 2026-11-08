/** Kinds of group-chat message the app writes (shared by the club core and the UI). */
export const MATCH_MESSAGE_KINDS = ['reminder', 'share'] as const;
/** "reminder" names who still has to answer; "share" announces the match. */
export type MatchMessageKind = (typeof MATCH_MESSAGE_KINDS)[number];
