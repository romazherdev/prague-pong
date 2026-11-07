# 02: Import fixtures from the STIS CSV

**What to build:** The admin runs an import command with the club's STIS CSV calendar export, and the calendar then shows the real fixtures for all 4 teams. The STIS adapter parses the file; the club core stores the matches.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The STIS adapter turns the CSV export into plain fixture records (team, opponent, home or away, venue or address, date and time, STIS match id) and knows nothing about the database or the club core
- [ ] The adapter is tested on a saved real STIS CSV checked in as a test fixture
- [ ] A malformed file fails loudly and returns no partial data (covered by a test)
- [ ] The club core's "import season fixtures" command is idempotent, keyed by STIS match id; running the same import twice creates no duplicates (covered by a test)
- [ ] An import command (CLI or server script) runs the adapter, then the core, for a given club
- [ ] After importing the real file, the deployed calendar shows the matches of all 4 teams
