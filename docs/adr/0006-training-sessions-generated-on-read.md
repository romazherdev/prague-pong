# 0006: Training sessions are stored, and generated from the rules when they are read

Date: 2026-11-08
Status: accepted

## Context

Training is a weekly rule (e.g. Tue and Thu 18:00–20:00), but members answer for, and admins cancel, single sessions. Those need an identity to attach answers and cancellations to. There is no job scheduler on the server.

## Decision

- Sessions are rows (`training_sessions`, unique per rule and date), not computed on the fly.
- Whenever sessions are listed (calendar, my events, admin pages), the core first creates any missing sessions for the next 8 weeks from the active rules (`INSERT OR IGNORE`). Reads therefore write sometimes; that's idempotent and cheap, and it removes the need for a scheduled job.
- Times are worked out per date from the rule's wall-clock times in the club's time zone, so 18:00 stays 18:00 across daylight-saving switches.
- Editing a rule changes only sessions that haven't started (moved times keep answers and cancellations; dropped days lose theirs). Ending a rule removes only its future sessions. Past sessions are history and stay.

## Consequences

- The first read after a quiet period does the inserts. Fine at one club's scale.
- A cancelled session stays cancelled through rule edits, because it's the same row.
