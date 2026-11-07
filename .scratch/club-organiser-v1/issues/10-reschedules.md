# 10: Reschedules

**What to build:** When a league match is moved, the captain or an admin changes its date and time. Earlier yes and maybe answers become "please reconfirm," and the line-up shows it needs attention.

**Blocked by:** 08

**Status:** resolved

- [x] The team's captain or an admin can change a match's date and time
- [x] On a date or time change, every yes and maybe for that match becomes "please reconfirm"; no answers stay as they are (covered by a test)
- [x] Members see "please reconfirm" highlighted in "my upcoming events" and answer again in one tap
- [x] The match's line-up shows "needs attention" until the captain reviews or saves it again
- [x] Clash flags (09) are recalculated for the new date

## Comments

- 2026-11-07: Implemented. `core.rescheduleMatch` (the team's captain or an admin; club-local "YYYY-MM-DDTHH:mm"; keeps the match's length; not for a match already played, not into the past; no-op when the time doesn't change). `markMatchMoved` (`core/match-moves.ts`) holds the rule: yes/maybe get `needs_reconfirm` (the old answer stays visible as "dříve: …"), "no" stays, and the line-up gets `lineup_needs_attention`. The STIS import uses the same rule when `--apply-changes` moves a match (ADR 0002's follow-up). Answering again clears the flag; saving the line-up or "Sestava může zůstat" clears needs-attention. UI: a "Přesunout zápas" form on the match page for the captain or an admin; "Potvrďte znovu" in my events (with a count); a "Mají potvrdit znovu" group on the match page; reconfirm answers in the line-up picker, its warnings, and the captain list (with a reconfirm count). Clash flags are computed when read, so they follow the new date (tested).
- Known: without `--apply-changes`, a match moved in the app keeps showing in the import's `changedNotApplied` list, because STIS still has the old date. That's expected (reschedules are entered by hand).
- For ticket 11: "spot open" is a line-up player whose current answer is "no". With reschedules, a reconfirm isn't a "no", so it doesn't open a spot.

