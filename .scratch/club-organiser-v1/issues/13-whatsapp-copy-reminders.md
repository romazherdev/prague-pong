# 13: WhatsApp copy reminders

**What to build:** On any match, a captain or admin can copy a ready-to-paste WhatsApp message: a reminder naming who hasn't answered, or a share message with the match details and a link to the match.

**Blocked by:** 07

**Status:** resolved

- [x] "Copy reminder" builds a message with the match (team, opponent, date, time) and the names of active members of the team who haven't answered, plus the match link
- [x] "Copy share message" builds a message with the match details and its public calendar link
- [x] Messages never contain personal links
- [x] Messages are in Czech by default, with an option for English
- [x] Building the message is a club core query covered by a test (with a fixed clock and fixed responses)

## Comments

- 2026-11-08: Implemented. `core.matchMessage(actor, clubId, matchId, 'reminder' | 'share', { origin, locale })` (`core/messages.ts`; the match team's captain or an admin). The reminder names the team's active members who haven't answered and, after a reschedule, everyone who has to confirm the new date (any team); it says so when everyone has answered. The share message gives date, time, home/away and venue with address. Both link to the public match page `/<club>/matches/<id>` (the "public calendar link"), never to a personal link; the test checks the members' real tokens. UI: a "Zprávy do skupiny na WhatsAppu" box for the captain or an admin on the match page and the line-up page, Czech by default with an English toggle, "Kopírovat" and "Otevřít ve WhatsAppu" (shared `CopyShare` component, also used for personal-link messages). Not shown for past matches.
- For ticket 14: add training sessions as another message subject; `MATCH_MESSAGE_KINDS` in `src/lib/message-kinds.ts` lists the kinds.

