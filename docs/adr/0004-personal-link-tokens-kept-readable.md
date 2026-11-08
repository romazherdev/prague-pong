# 0004: Personal-link tokens are kept readable, unlike sign-in and session tokens

Date: 2026-11-07
Status: accepted

## Context

ADR 0003 stores sign-in link and session tokens only as hashes. Personal links work differently: the admin sends each member their link privately on WhatsApp, and members lose messages, change phones, or ask "can you send it again?". If only a hash were stored, re-sending would mean regenerating, which breaks the link on every device the member already uses.

## Decision

- A member's personal-link token (256-bit random) is stored as is, in `members.link_token`, so an admin can show the member's link and WhatsApp message at any time.
- Opening the link (`/<club>/m/<token>`) saves the token in an httpOnly cookie on that device and redirects to `/<club>/me`, so the secret doesn't stay in the address bar or history. The installed PWA (ticket 12) uses the cookie.
- Regenerating the token invalidates the old link and every device holding it at once. Deactivating a member stops their link working (reactivating brings it back).

## Consequences

- Someone who can read the database can act as any member. A personal link only ever allows member actions (ADR 0003), so the damage is limited to answering for members; admin and captain powers still need a session.
- Admin pages show links; admins must send them privately (the UI says so). Group-chat messages (ticket 13) must never contain them.
- The token is in the URL the first time the link is opened, so it can appear in server or proxy access logs. Keep those logs private.
- If a device already belongs to another member, opening a link asks before switching, so nobody can swap a person's identity by sending them a different link.

## Addendum (2026-11-08, ticket 12): the installed app starts at the personal link

An app added to the iPhone home screen doesn't share Safari's cookies, so the `member` cookie alone can't tell the installed app who it belongs to. The club's web app manifest is therefore personal: fetched with credentials and never cached, its `start_url` is the device member's own personal link (for a signed-in captain too, so they can turn on push from the installed app).

- Scripts running on the site can read the token from the manifest, unlike the httpOnly cookie. An XSS bug could therefore leak a member's link for later use, not only act as them while the page is open. Accepted: a personal link only ever allows member actions (ADR 0003), and the alternative is no identity in the installed iPhone app.
- After an admin makes a new link, an installed app keeps opening the old one (and shows "link not valid") until the member removes the app and adds it again from the new link.
