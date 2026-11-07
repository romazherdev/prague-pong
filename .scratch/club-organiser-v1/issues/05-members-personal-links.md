# 05: Members and personal links

**What to build:** An admin manages club members. Each member gets a private personal link and a ready-to-send WhatsApp message. Opening the link shows that member's upcoming events in their preferred language.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] An admin can add a member (name; email optional), edit them, and deactivate them; deactivated members disappear from lists but their history is kept
- [ ] Each member has a long random token; their personal link identifies them without a login
- [ ] An admin can regenerate a member's token; the old link stops working immediately (covered by a test)
- [ ] For each member the admin gets a "copy WhatsApp message" with the link, meant to be sent privately
- [ ] Opening a personal link shows "my upcoming events" (matches for now)
- [ ] A personal link never grants captain or admin powers, even for a member who is a captain
- [ ] A member can set their language; it's saved with the member and beats the device preference and the browser's language (the resolution order is covered by a test)
