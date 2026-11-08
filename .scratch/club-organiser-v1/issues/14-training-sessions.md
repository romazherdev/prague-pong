# 14: Training sessions

**What to build:** An admin sets up the club's recurring training (e.g. Tue and Thu 18:00–20:00). Sessions appear automatically in the calendar and in "my upcoming events," where members tap in or out and see how many are coming. An admin can cancel a single session.

**Blocked by:** 07

**Status:** resolved

- [x] An admin creates, edits and ends training rules (weekdays, start and end time, venue)
- [x] Sessions are generated for upcoming weeks from the rules (generation is tested with a fixed clock)
- [x] An admin can cancel a single session; members see it as cancelled
- [x] Members tap in or out; the latest answer wins
- [x] A session shows the number of members coming
- [x] Training sessions appear in the club calendar and in "my upcoming events" alongside matches
- [x] If 13 is done, "copy reminder" and "copy share message" work for training sessions too

## Comments

- 2026-11-08: Implemented. `core/training.ts`: weekly rules (ISO weekdays, club-time start/end, venue), sessions generated for the next 8 weeks when read (ADR 0006), cancel and restore a session, in/out answers (the latest wins; not for cancelled or past sessions), a count of who's coming (active members). Admin page `/<club>/admin/training` (add, edit, end rules; next sessions). Session page `/<club>/trainings/<id>` (public, like a match page; members also see who's coming and tap in or out; admins cancel or restore and get WhatsApp messages). Trainings appear in the calendar's evenings (on every team filter: training is club-wide) and in "Moje akce" (their own section, next 6).
- Decisions: the training WhatsApp reminder gives the number coming rather than naming non-responders (the list would be the whole club). Restoring a cancelled session was added for mistakes. Ending a rule refuses dates before yesterday and never deletes past sessions; editing never changes a session that has started.
- For ticket 15: sessions have `date` (the evening), `startsAt`/`endsAt` and `venue`; `clubCalendar` returns `trainings` with `evening`; `clubSettings.minTrainingTables` is waiting.

