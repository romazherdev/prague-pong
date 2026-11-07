# 08: Captain line-ups and substitutes

**What to build:** A signed-in captain opens one of their team's matches, sees availability (their own team first, then possible substitutes from other teams), and picks the 4 players. Members see when they're in a line-up.

**Blocked by:** 06, 07

**Status:** resolved

- [x] The captain's match view groups members by availability, with their own team first and other teams marked as substitutes
- [x] The captain can set a line-up of up to 4 active members from any team, with no player order
- [x] A warning (not a block) when a picked player answered no or maybe or hasn't answered
- [x] Only that team's captain or an admin can change a line-up; an admin can act as captain for any team
- [x] Members see in "my upcoming events" when they're in a line-up
- [x] League rules are not enforced
- [x] Playwright smoke test: a captain signs in, sets a line-up, and the member sees they're in it

## Comments

- 2026-11-07: Implemented. Core (`core/lineups.ts`): `lineupView` (every active member with their answer: own team first, then substitutes; yes, maybe, no answer, no), `setLineup` (up to 4 different active members of any team; past matches refused; returns warnings for anyone without a "yes"), `captainMatches` (upcoming matches of the teams the signed-in member captains, all teams for an admin, with line-up size and answer counts), `canManageLineup`, `matchLineup`. Permissions go through `accessRules.requireCaptainOf` (admins act as captain of any team). UI: `/<club>/captain` (the captain's match list, nav link "Moje zápasy"), `/<club>/matches/<id>/lineup` (checkboxes, limit of 4 enforced as you tick, warnings after saving), the line-up on the match page, and "Hraješ" in my events. Playwright: `e2e/captain-lineup.e2e.ts` (the seed captures a real sign-in link for the captain).
- Extras: the captain match list (with yes/maybe/no counts; finishes story 24 started in 07); every member sees the line-up on the match page.
- For later tickets: line-up rows stay when a member is deactivated (history), but every query counts only active members. Do the same in clash checks (09). The line-up is "players whose current answer…": ticket 11's "spot open" can be derived from `lineupView` (answer = "no"). Ticket 10's "needs attention" can be a column on `matches`, cleared by `setLineup`.

