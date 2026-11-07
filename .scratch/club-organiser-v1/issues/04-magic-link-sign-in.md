# 04: Admin and captain sign-in by magic link

**What to build:** An admin or captain enters their email and receives a sign-in link. Following it starts a session with that role's powers. The first admin is created by a setup command.

**Blocked by:** 01

**Status:** resolved

- [x] A setup command creates the first admin for a club (email address)
- [x] Request a sign-in link by email; the link is single-use and expires
- [x] A signed-in session carries the role (admin, or captain of a specific team)
- [x] An admin can make a member the captain of a team and remove that role
- [x] Routes for admins and captains reject requests that only have a personal link or no session (covered by tests through the core or the route layer)
- [x] Email sending sits behind a port; tests use a fake that records sent links

## Comments

- 2026-11-07: Implemented. `npm run setup:admin -- --club <slug> --name <name> --email <email>` creates the first admin. `/<club>/sign-in` emails a single-use link (15 min, max 3 live per member); opening it shows a "Sign in" button (mail scanners can't use it up); the session cookie lasts 60 days. `/<club>/admin` lets an admin pick each team's captain. Permissions live in the club core: guarded commands take an `Actor` and throw `ForbiddenError`; `guarded()` in `src/lib/server/request.ts` turns that into a redirect to sign-in (no session) or 403. Design recorded in ADR 0003; terms added to CONTEXT.md.
- Review fixes: links are built from `ORIGIN` (required in production, set in `fly.toml`), never the Host header; the form doesn't await the email, so it answers the same for every address; 403/404 messages are translated.
- Email goes through Resend when `RESEND_API_KEY` and `MAIL_FROM` are set, otherwise to the server log (see DEPLOY.md). Choosing and setting up the provider is the owner's call.
- For ticket 05: members can't be given an email in the UI yet, so for now only admins can be picked as captains in practice. 05's member editing must allow an email. `accessRules(db).requireCaptainOf` exists for 08 (admins pass it for any team). `listMembers` is in `core/members.ts`, ready to extend. Personal-link routes must build `{ via: 'personal-link' }` actors only.

