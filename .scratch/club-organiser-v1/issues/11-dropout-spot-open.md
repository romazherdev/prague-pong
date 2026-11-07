# 11: Drop-out: spot open

**What to build:** When a player in a line-up changes their answer to no, their spot shows as open, the match turns red for the captain, and the club core sends a "spot open" notification intent for the captain. Nothing is swapped automatically.

**Blocked by:** 08

**Status:** resolved

- [x] A line-up player changing to no marks their spot as open (they stay listed as dropped until the captain replaces or removes them)
- [x] The match shows "spot open" in red in the captain's view and in the calendar
- [x] The club core sends a "spot open" notification intent to the notifier port for the team's captain (checked with the fake notifier)
- [x] No automatic substitution happens
- [x] Changing back to yes clears the open spot

## Comments

- 2026-11-07: Implemented. A **drop-out** is a line-up player who answered "no" *after* being picked (`DROPPED_OUT_SQL` in `core/lineups.ts`, the one definition; `lineup_players.picked_at`). A "no" the captain already knew about is only a warning. `spotsOpen` appears in the line-up view (red alert listing who), the captain list and the calendar (red badge `SpotOpenBadge`), and on the match page (the dropped player struck through). Responses report each answer change (`onAnswerChanged`); `core/dropouts.ts` returns `spotOpen` intents, and `deliver()` sends them only after the answer is saved (a failed delivery is logged and never undoes the answer). Nothing is swapped automatically; answering yes or maybe again clears the spot.
- Decisions: if the team has no active captain, or the captain is the one dropping out, the admins get the intent instead (so somebody always hears). Members can see on the match page who dropped out (answers are visible to members anyway, ticket 07).
- For ticket 12: the web-push notifier implements `Notifier.send(intent)` (may return a promise); `deliver()` already catches failures. Intents: `{ kind: 'spotOpen', recipientMemberId, data: { matchId, memberId, memberName } }`.

