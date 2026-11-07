# 0003: Magic-link sign-in, sessions, and actors checked by the club core

Date: 2026-11-07
Status: accepted

## Context

Members use a private personal link (no login). Captains and admins need more powers, and the spec asks for an emailed magic link for them, with personal links never allowing more than member actions. The app also needs a place where "who may do what" is enforced and tested.

## Decision

- **Actors.** Every guarded club-core command takes an `Actor` (`{ via: 'session' | 'personal-link', memberId }`) and checks permissions itself (`accessRules`). Admin and captain powers require `via: 'session'`; a personal-link actor can never pass those checks, whoever the member is. Roles are read from the database on every call, so removing a captain takes effect at once.
- **Sign-in links.** 256-bit random tokens, stored only as SHA-256 hashes. Single-use, valid 15 minutes, scoped to the club. At most 3 live links per member, so the form can't flood an inbox. The request form answers the same for every address and doesn't wait for the email to be sent, so it doesn't reveal who has an account.
- **Confirm step.** Opening the emailed link shows a "Sign in" button; signing in happens on the POST. Mail scanners that prefetch links would otherwise use up the single-use link.
- **Sessions.** Random token in an httpOnly, SameSite=Lax cookie, stored hashed, valid 60 days, deleted at sign-out.
- **Link origin.** Links are built from the `ORIGIN` setting, never the request's Host header (required in production).
- **Email.** Behind a `Mailer` port. Production uses Resend's HTTP API when `RESEND_API_KEY` is set; otherwise emails are printed to the server log (enough for the first admin on a new server).
- **First admin.** A setup command (`npm run setup:admin`), not a web flow: there is no club sign-up.

## Consequences

- Captains need an email on their member record to sign in. Members' emails are collected only for that, not for reminders (spec: out of scope).
- Route code doesn't decide permissions; it maps the core's `ForbiddenError` to a redirect to sign-in (no session) or 403.
- Switching mail provider means one new `Mailer` implementation.
