# 02: Import fixtures from the STIS CSV

**What to build:** The admin runs an import command with the club's STIS CSV calendar export, and the calendar then shows the real fixtures for all 4 teams. The STIS adapter parses the file; the club core stores the matches.

**Blocked by:** 01

**Status:** resolved

- [x] The STIS adapter turns the CSV export into plain fixture records (team, opponent, home or away, venue or address, date and time, fixture key — the export has no match id, see ADR 0002) and knows nothing about the database or the club core
- [x] The adapter is tested on a saved real STIS CSV checked in as a test fixture
- [x] A malformed file fails loudly and returns no partial data (covered by a test)
- [x] The club core's "import season fixtures" command is idempotent, keyed by fixture key; running the same import twice creates no duplicates (covered by a test)
- [x] An import command (CLI or server script) runs the adapter, then the core, for a given club
- [ ] After importing the real file, the deployed calendar shows the matches of all 4 teams

## Comments

- 2026-11-07: Implemented. The STIS export is one CSV per team, in windows-1250, with no match id; fixtures are keyed by competition + home + away (ADR 0002). Tested on the 4 real exports for teams A–D (70 fixtures) checked in under `code/src/lib/server/stis/test-fixtures/`. Import command: `npm run import:fixtures` (see `code/DEPLOY.md`). Verified locally that all 70 matches show in the calendar; the deployed check waits for the first deploy.
- Finding for ticket 09: 16 evenings this season have two home matches at Pod Juliskou (e.g. 11 Nov: B and D; 18 Nov: A and C).
- 2026-11-07 (review): fixtures changed in STIS are now reported, not applied, unless `--apply-changes` (matches the spec's out-of-scope line on keeping the schedule in sync); team names whitespace-normalised in keys; all-day rows rejected; `tsx` moved to runtime dependencies so the import works inside the production image.
