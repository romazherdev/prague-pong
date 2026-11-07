# 15: Tables free for training

**What to build:** Each training session shows how many tables are left after that evening's home matches. When fewer than the configured minimum are left, the session and the evening are flagged.

**Blocked by:** 09, 14

**Status:** ready-for-agent

- [ ] Free tables per session = total tables − (home matches that overlap the session × tables per match), never below 0
- [ ] The session shows "X coming, Y tables free"
- [ ] A warning on the session and the calendar evening when free tables < the configured minimum
- [ ] The admin sees the warning on the session and can cancel it from there
- [ ] Covered by tests through the club core, including the evening with two home matches
