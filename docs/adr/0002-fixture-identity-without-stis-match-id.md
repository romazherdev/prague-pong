# 0002: Fixtures are identified by competition + home + away, not a STIS match id

Date: 2026-11-07
Status: accepted

## Context

The spec planned to key imported matches by their STIS id, so re-importing is idempotent. The real per-team STIS calendar export ("CSV export kalendáře utkání") has no match id: each row has only a subject ("Utkání 5TMB"), start and end date and time, a "Home - Away" description and a location.

## Decision

A fixture's key is `competition|home team|away team`, e.g. `5TMB|TJ Mladí Veteráni - VSK ČVUT A|TTC Praha F`. In a league season each pairing is played once at each team's hall, so this is unique per club. Date and venue are deliberately not part of the key, so a match moved in STIS is updated on re-import instead of duplicated.

## Consequences

- Re-importing the same file changes nothing; a changed date or venue updates the existing match.
- If a competition ever schedules the same home/away pairing twice (play-offs, a cup), keys would collide and the second match would overwrite the first. The importer would need a sequence number then.
- A match between two of the club's own teams in the same competition can't be told apart by the prefix rule, and the parser rejects it. That doesn't happen this season (all 4 teams are in different groups).
- Ticket 10 (reschedules) must decide how an import that moves a date interacts with answers ("please reconfirm"). Until then, an import silently updates the date.
