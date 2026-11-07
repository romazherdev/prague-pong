# 07: Match responses

**What to build:** From their personal link, a member answers yes, maybe or no for any match (their own team's or another team's), changes the answer at any time, and sees which matches they haven't answered yet.

**Blocked by:** 05

**Status:** resolved

- [x] The club core has a "record response" command (member, match, yes, maybe or no); the latest answer wins
- [x] Members can answer for matches of any team (so they can be substitutes)
- [x] The "my upcoming events" view highlights unanswered matches
- [x] The core can list, for a match, who said yes, maybe, no, or hasn't answered (active members only)
- [x] Answering takes one tap on mobile; the buttons are large
- [x] Playwright smoke test: open a personal link, answer a match, reload, the answer is still there

## Comments

- 2026-11-07: Implemented. Core: `recordResponse` (upcoming matches of any team; the latest answer wins), `matchResponses` (yes / maybe / no / unanswered; active members only), `myAnswer`, and "my events" (`core/my-events.ts`) with each match's answer and a count of the member's own team's unanswered matches. UI: `AnswerButtons` (three 52px buttons, one tap, works without JS, shows errors) on "my events" and the match page; the match page lists who can play. Playwright smoke test in `code/e2e/` (`npm run test:e2e`, set `CHROME_PATH` to use an installed Chrome); its web server seeds a fresh database.
- Decisions: answers are visible to every member on the match page, not only captains. The club already sees answers in the WhatsApp group, and it helps members see whether a match is covered. "Hasn't answered" means active members of the match's team; other teams' members show up only when they answer. Past matches (day over, club time zone) can't be answered any more. Only the member's own team's unanswered matches are flagged.
- For ticket 10: `match_responses.answer` has `CHECK (answer IN ('yes','maybe','no'))`. Model "please reconfirm" as a separate flag (e.g. `needs_reconfirm`), not a fourth answer, which also keeps the old answer visible.
- For ticket 08: the captain view should build on `matchResponses` (`fromOtherTeam` marks possible substitutes). Stories 24–25 are completed there.

