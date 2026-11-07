# 0005: Roster players are identified by STIS player id, and STIS decides a confirmed player's team

Date: 2026-11-07
Status: accepted

## Context

Team rosters come from the club's STIS page. Each roster player has to be matched to a member once (the admin confirms the suggestion), and importing again later must not duplicate anything or lose those confirmations. Players also move between teams during a season, and the admin can set a member's team by hand when STIS can't be read or is wrong.

## Decision

- A roster entry is keyed by `stis:<STIS player id>`; when the page gives no id, by `name:<team>:<normalised name>` (accents, case and word order ignored).
- The admin confirms who each entry is. A member is one STIS player: confirming them elsewhere moves the link, and a unique index stops two members sharing a STIS player id.
- Suggestions: the one active member with a matching name who isn't confirmed for another player. Two matches mean no suggestion.
- On re-import, a confirmed player who moved team in STIS moves their member too (STIS is where league registration lives). Members who left the club are left alone. The import reports how many moved.
- Setting a team by hand is for members STIS doesn't cover (training-only, or before the roster import). A later re-import that moves the player overrides it.

## Consequences

- Without STIS ids, a player who changes team gets a second, unconfirmed entry; the old one stays. Ticket 16 will show whether the real page has ids.
- Players who drop off a roster are not removed yet.
