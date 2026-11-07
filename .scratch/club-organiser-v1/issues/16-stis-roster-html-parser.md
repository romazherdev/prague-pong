# 16: Parse team rosters from the STIS club page

**What to build:** The STIS adapter part of ticket 06. The admin uploads (or the import command reads) the saved HTML of the club's STIS page; the adapter turns it into roster records (`RosterImport[]`: team letter, player name as STIS shows it, STIS player id if the page has one), and `core.importRosters` stores them for the admin to confirm at `/<club>/admin/rosters` (already built in 06).

**Blocked by:** 06

**Status:** needs-info

**Needs:** a saved copy of the club's STIS page with the team rosters (the HTML file as the browser saves it, "Uložit stránku jako…"), checked in under `code/src/lib/server/stis/test-fixtures/`. The agent sandbox can't reach stis.ping-pong.cz, so the owner has to download it. Once it's in the repo, set Status to `ready-for-agent`.

- [ ] The STIS adapter parses the rosters (team, player name, STIS player id if available) from the saved club page; tested on the real page checked in as a test fixture
- [ ] A page that can't be parsed fails loudly with no partial data (covered by a test)
- [ ] An import entry point: an upload form on `/<club>/admin/rosters` and/or `npm run import:rosters -- --club <slug> page.html`
- [ ] After importing the real page, the review page lists all 4 teams' players with sensible suggestions
