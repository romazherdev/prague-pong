# 06: STIS rosters and team assignment

**What to build:** The admin imports team rosters from the club's STIS page. The app suggests which member each roster player is, the admin confirms, and members end up on the right team. A manual team assignment covers anything the import misses.

**Blocked by:** 02, 05

**Status:** ready-for-agent

- [ ] The STIS adapter parses the rosters (team, player name, STIS player id if available) from the HTML of the club's STIS page; it's tested on a saved real page checked in as a test fixture
- [ ] A page that can't be parsed fails loudly with no partial data
- [ ] The admin sees each roster player with a suggested member match (by name) and confirms, changes or creates a new member
- [ ] Confirmed matches link the member to the STIS player and set their team
- [ ] An admin can assign or change any member's team by hand
- [ ] Members not on any STIS roster (training-only) can exist without a team
- [ ] Re-importing rosters doesn't duplicate members or overwrite links that were already confirmed
