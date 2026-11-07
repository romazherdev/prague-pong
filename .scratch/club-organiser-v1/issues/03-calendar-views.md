# 03: Calendar views

**What to build:** Members can filter the club calendar to one team, past matches are hidden by default, and each match has a detail page with everything needed to get there.

**Blocked by:** 01

**Status:** resolved

- [x] Filter by team (A–D) or all teams
- [x] Past matches hidden by default, with an option to show them; "past" is decided by the clock port (tested with a fixed clock)
- [x] The match detail page shows date, start time, home or away, opponent, venue name and address
- [x] An "open in maps" link for the venue address (works with Google Maps and Mapy.cz)
- [x] All new text in Czech and English

## Comments

- 2026-11-07: Implemented. Club core: `listMatches(clubId, { teamId?, includePast? })` replaces `listUpcomingMatches` (upcoming-only stays the default), plus `listTeams` and `getMatch` (club-scoped, past or upcoming). Calendar at `/<club>?team=B&past=1` (team by name so links stay readable; an unknown name shows all teams). Match page at `/<club>/matches/<id>`. "Past" means the match's local date (club time zone) is before today, so a match stays listed until midnight after it's played; covered with a moving fixed clock.
- Deviations: "open in maps" is two buttons, Mapy.cz and Google Maps, using each provider's documented URL scheme (`src/lib/maps.ts`), shown for home matches too. The match page also shows the end time and the competition code (both already imported). The calendar list shows the venue name only; the address is on the match page.
- For later tickets: `HomeAwayBadge` is a shared component in `src/lib/components/`. The match page is the natural place for responses (07), the line-up (08) and the "spot open" state (11). The seed builder's `match()` now takes optional `endsAt` and `competition`. Local dev on this sandbox needed `npm_config_nodedir=/opt/node22 npm ci` because better-sqlite3 couldn't download Node headers.

