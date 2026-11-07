# 11: Drop-out: spot open

**What to build:** When a player in a line-up changes their answer to no, their spot shows as open, the match turns red for the captain, and the club core sends a "spot open" notification intent for the captain. Nothing is swapped automatically.

**Blocked by:** 08

**Status:** claimed

- [ ] A line-up player changing to no marks their spot as open (they stay listed as dropped until the captain replaces or removes them)
- [ ] The match shows "spot open" in red in the captain's view and in the calendar
- [ ] The club core sends a "spot open" notification intent to the notifier port for the team's captain (checked with the fake notifier)
- [ ] No automatic substitution happens
- [ ] Changing back to yes clears the open spot
