# 06: STIS rosters and team assignment

**What to build:** The admin imports team rosters from the club's STIS page. The app suggests which member each roster player is, the admin confirms, and members end up on the right team. A manual team assignment covers anything the import misses.

**Blocked by:** 02, 05

**Status:** resolved

- [ ] The STIS adapter parses the rosters (team, player name, STIS player id if available) from the HTML of the club's STIS page; it's tested on a saved real page checked in as a test fixture
- [ ] A page that can't be parsed fails loudly with no partial data
- [x] The admin sees each roster player with a suggested member match (by name) and confirms, changes or creates a new member
- [x] Confirmed matches link the member to the STIS player and set their team
- [x] An admin can assign or change any member's team by hand
- [x] Members not on any STIS roster (training-only) can exist without a team
- [x] Re-importing rosters doesn't duplicate members or overwrite links that were already confirmed

## Comments

- 2026-11-07: Built everything except reading the STIS page. The agent sandbox can't reach stis.ping-pong.cz, so there is no real saved page to test a parser on. Criteria 1–2 (the HTML parser and its fail-loudly test) moved to **ticket 16** (status needs-info: the owner needs to save the page into the test fixtures). **Story 2 ("import each team's roster from the club's STIS page") is not usable by an admin until 16 is done.**
- Built: `core.importRosters` (takes parsed rosters, like the fixture import), `listRosterReview` (suggestions by name, ignoring accents, case and word order), `confirmRosterEntry` (an existing member, or a new member named from the roster), `setMemberTeam` (by hand, or no team for training only). Review page at `/<club>/admin/rosters`; team picker on each member's page; team tags in the member list. "My events" now shows the member's own team's matches first (small extra, prepares 08).
- Decisions in ADR 0005: entries are keyed by STIS player id; a member is one STIS player (unique index); on re-import, STIS moves a confirmed player's team (not for members who left); a team set by hand is overridden if STIS later moves the player.
- For later tickets: members now have `team` (`MemberSummary.team`), which line-ups (08) use to put the captain's own team first.

