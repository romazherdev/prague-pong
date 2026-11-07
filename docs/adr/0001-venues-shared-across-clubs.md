# 0001: Venues are shared across clubs, not club-scoped

Date: 2026-11-07
Status: accepted

## Context

The spec says every record carries a `clubId` so more clubs can be added without a migration. But a venue is a physical hall, and several clubs can play at the same one: Pod Juliskou hosts more than one club, and away matches take place at other clubs' halls. The ticket 01 review flagged the `venues` table as breaking the "every record carries clubId" rule.

## Decision

Venues are a global table with no `club_id`. Matches (club-scoped) reference a venue. The "every record carries clubId" rule applies to club-owned data (teams, members, matches, responses, line-ups, training, settings), not to shared reference data like venues.

## Consequences

- The same hall is one row, whichever club imports a match there; the parked public hall directory can build on it later.
- Venue data can't be edited per club. If a club needs club-specific details about a venue (e.g. which tables it rents), that goes in a club-scoped table that references the venue.
- STIS imports must find an existing venue (e.g. by normalised address) before creating one.
