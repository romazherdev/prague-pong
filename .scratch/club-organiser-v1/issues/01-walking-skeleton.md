# 01: Walking skeleton: club calendar from seeded data

**What to build:** A deployed SvelteKit app that shows one club's calendar of matches (from seeded test data) in Czech or English. It sets up the club core API, the SQLite schema (every record carries `clubId`), translation files and the test harness that every later ticket reuses.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] SvelteKit app with SQLite; the schema includes club, venue, team and match, all scoped by `clubId`
- [x] The club core exposes a "list upcoming matches for a club" query; the UI route only calls the core
- [x] The calendar page lists the seeded matches (date, time, team, opponent, home or away)
- [x] All UI text comes from translation files (Czech and English); the language is resolved from the preference saved on the device, then the browser's language, then Czech; a language switcher saves the device preference
- [x] Test harness: the club core runs against SQLite in memory with a fixed clock and a fake notifier that records notification intents; at least one test of the core goes through it
- [ ] Deployed to a single small VPS or Fly.io, with a written deploy procedure and a backup procedure for the SQLite file

## Comments

- 2026-11-07: Implemented in `code/` (club core, schema, i18n, calendar page, seed script, test harness). Deploy procedure and backup script are in `code/DEPLOY.md` and `code/Dockerfile`/`fly.toml`; the actual deploy is still to be run by the owner. Venues are deliberately not club-scoped (see `docs/adr/0001-venues-shared-across-clubs.md`).
