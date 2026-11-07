# 09: Clash warnings for matches

**What to build:** The calendar and the captain views flag evenings with problems: a player in two line-ups on the same evening, or home matches needing more tables than the club has.

**Blocked by:** 08

**Status:** resolved

- [x] Club settings (admin-editable): total tables (default 8), tables per home match (default 3), minimum tables for viable training (stored now, used in 15)
- [x] The calendar query returns clash flags per evening; the UI only renders them
- [x] Flag: the same member in two line-ups on the same evening
- [x] Flag: home matches on one evening × tables per match > total tables
- [x] Evenings with clashes are highlighted in the calendar, and the captain sees the warning on the affected match
- [x] Each clash rule is covered by tests through the club core

## Comments

- 2026-11-07: Implemented. Club settings (`core/settings.ts`, page `/<club>/admin/settings`): total tables 8, tables per home match 3, minimum for training 2 by default. The spec gives no default for the minimum; 2 was picked so that two home matches (8 − 6 = 2) still count as viable. The club reports often having only 1, so the admin may lower it. `core.clubCalendar` returns matches (each with its `evening`, the club's local date) and clash flags per evening: `tooFewTables` (home matches × tables per match > total) and `doubleBooked` (an active member in two line-ups). The calendar groups matches into evenings and outlines a clashing evening in red with the reason; the captain's line-up page shows clashes on that match's evening.
- Decisions: double bookings name a member, so the public calendar shows them only to members (personal link or session). Clashes are checked across all teams even when the calendar is filtered to one. Tables per match can't exceed total tables.
- Known limitation: the table check counts the club's *home* matches (the spec's rule), not every match at the club's venue. Venues are shared (ADR 0001), so another club's match at Pod Juliskou isn't counted. Revisit if that happens.
- For ticket 15: `minTrainingTables` is stored and read through `core.clubSettings`; the training check can be added to `clashesAmong` as a third kind, with training sessions on the same evenings.

