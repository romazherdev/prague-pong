# 05: Members and personal links

**What to build:** An admin manages club members. Each member gets a private personal link and a ready-to-send WhatsApp message. Opening the link shows that member's upcoming events in their preferred language.

**Blocked by:** 04

**Status:** resolved

- [x] An admin can add a member (name; email optional), edit them, and deactivate them; deactivated members disappear from lists but their history is kept
- [x] Each member has a long random token; their personal link identifies them without a login
- [x] An admin can regenerate a member's token; the old link stops working immediately (covered by a test)
- [x] For each member the admin gets a "copy WhatsApp message" with the link, meant to be sent privately
- [x] Opening a personal link shows "my upcoming events" (matches for now)
- [x] A personal link never grants captain or admin powers, even for a member who is a captain
- [x] A member can set their language; it's saved with the member and beats the device preference and the browser's language (the resolution order is covered by a test)

## Comments

- 2026-11-07: Implemented. Admin pages `/<club>/admin/members` (add, list, former members) and `/<club>/admin/members/<id>` (personal link, the WhatsApp message in Czech or English with copy and "open in WhatsApp", new link, edit name and email, "left the club"). A personal link `/<club>/m/<token>` saves the token in an httpOnly `member` cookie and redirects to `/<club>/me` ("my events"). If the device already belongs to another member, it asks before switching. Tokens are stored readable so admins can re-send links (ADR 0004). The member's saved language comes first, then the device, browser and Czech; switching language saves it with the device's member (personal link or session).
- Also done, not asked for: reactivating former members; deactivating removes the member as captain and ends their sessions; validation (name required, email unique and well-formed, an admin can't deactivate themselves). `club-core.ts` now only composes modules (`calendar.ts`, `access.ts`, `members.ts`).
- Review fixes: closed an open redirect in `/language` (`sameSitePath`), unused code removed, `getMember` added.
- For later tickets: `myUpcomingEvents` returns all the club's upcoming matches for now; 06 knows the member's team, 07 adds answers. When 07 lands, update the `personalLink.message` text to mention answering. Use `guardedForm()` for form actions: an `InvalidInputError` code becomes `fail(400, { error })`, shown via the `error.<code>` messages.

