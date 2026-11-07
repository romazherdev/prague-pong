# 08: Captain line-ups and substitutes

**What to build:** A signed-in captain opens one of their team's matches, sees availability (their own team first, then possible substitutes from other teams), and picks the 4 players. Members see when they're in a line-up.

**Blocked by:** 06, 07

**Status:** claimed

- [ ] The captain's match view groups members by availability, with their own team first and other teams marked as substitutes
- [ ] The captain can set a line-up of up to 4 active members from any team, with no player order
- [ ] A warning (not a block) when a picked player answered no or maybe or hasn't answered
- [ ] Only that team's captain or an admin can change a line-up; an admin can act as captain for any team
- [ ] Members see in "my upcoming events" when they're in a line-up
- [ ] League rules are not enforced
- [ ] Playwright smoke test: a captain signs in, sets a line-up, and the member sees they're in it
