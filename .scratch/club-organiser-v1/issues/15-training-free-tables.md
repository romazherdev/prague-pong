# 15: Tables free for training

**What to build:** Each training session shows how many tables are left after that evening's home matches. When fewer than the configured minimum are left, the session and the evening are flagged.

**Blocked by:** 09, 14

**Status:** resolved

- [x] Free tables per session = total tables − (home matches that overlap the session × tables per match), never below 0
- [x] The session shows "X coming, Y tables free"
- [x] A warning on the session and the calendar evening when free tables < the configured minimum
- [x] The admin sees the warning on the session and can cancel it from there
- [x] Covered by tests through the club core, including the evening with two home matches

## Comments

- 2026-11-08: Implemented. Every training session carries `freeTables` = total − (home matches at the session's venue that overlap it × tables per match), never below 0; `homeMatchIds`; and `belowMinTables` (fewer than the club's minimum; never for a cancelled session). A home match without an end time counts as 3 hours. A new clash kind `trainingTables` flags the calendar evening. The session page shows "Přijde: X · volné stoly: Y" and a warning; admins also see "zvažte zrušení" next to the cancel button. Trainings and matches in an evening are now listed by start time.
- Checked on the real STIS schedule: the club's home matches are on Wednesdays at 19:00, so Tue/Thu training never loses tables; a Wednesday 18:00–20:00 training is flagged on double-home evenings at a minimum of 3 (8 − 2×3 = 2).
- Decisions: only home matches at the training's own venue count. An evening can show both the match clash (`tooFewTables`: the home matches don't fit) and the training clash; they say different things.

