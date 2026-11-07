# Spec: Club organiser v1 (Mladí Veteráni)

Status: ready-for-agent
Agreed in a grilling session on 2026-11-07. Tickets: `issues/01-…15-…` in this folder. The app lives in `code/`.

## Problem Statement

I play for Mladí Veteráni, a table tennis club of about 24 active members with 4 league teams (A–D, 4 players per match). We train and play home matches at Pod Juliskou (ČVUT). Everything runs through one WhatsApp group, and that breaks down in predictable ways:

- Nobody has a single view of all 4 teams' league fixtures. Clashes are found late: two home matches on the same evening, a match eating into training, or one player needed by two teams.
- Captains build line-ups by asking around in the chat. Answers get buried, people forget to reply, and finding a substitute from another team means more messages.
- When a match is rescheduled, it's unclear who is still available.
- "Who's coming to training tonight?" is answered by a pile of messages, and nobody knows whether there will be enough tables.
- Chasing people who haven't answered is manual and annoying.

The club doesn't want to leave WhatsApp. It wants the annoying parts taken off it.

## Solution

A small bilingual (Czech/English) web app, installable as a PWA, for one club (built so more clubs can be added later).

- The season's fixtures and team rosters are imported from STIS, the Czech table tennis federation's results system, so the club calendar shows all 4 teams' matches immediately.
- Each member gets a private personal link (no login). Opening it shows their upcoming matches and training sessions, where they answer yes, maybe or no.
- Captains (signed in by an emailed magic link) see who is available, pick the 4 players for their match, bring in substitutes from other teams, and see clash warnings.
- Training sessions are generated from a recurring rule. Members tap in or out, and the app shows attendance against the tables free that evening.
- Reminders stay in WhatsApp: the app produces ready-to-paste messages listing who hasn't answered. Members who install the PWA can also opt in to push notifications.

Build and ship in four steps, each released to the club when done:
1. STIS import and the club calendar (read-only)
2. Personal links and match responses
3. Line-ups, substitutes, clash warnings, reschedules
4. Training sessions

## User Stories

### Calendar and import
1. As an admin, I want to import the season's fixtures from the club's STIS CSV export, so that I don't type in 40–80 matches by hand.
2. As an admin, I want to import each team's roster from the club's STIS page, so that members start out assigned to the right team.
3. As an admin, I want to match each imported STIS player to a member (suggested by name, confirmed by me), so that roster entries and app members are the same people.
4. As an admin, I want to add members who aren't registered in STIS (training-only players), so that everyone in the club can use the app.
5. As an admin, I want to assign or change a member's team by hand, so that I can fix the roster when the STIS page can't be read or is wrong.
6. As an admin, I want a clear error when an import file can't be parsed, so that I know to fall back to manual entry instead of getting a half-imported season.
7. As an admin, I want re-importing the same season to not duplicate matches, so that importing again is safe.
8. As a member, I want to see all 4 teams' matches in one calendar, so that I know what's happening across the club.
9. As a member, I want to filter the calendar to my own team, so that I see what matters to me first.
10. As a member, I want each match to show date, start time, home or away, opponent, and venue address, so that I know where and when to be.
11. As a member, I want a link to open an away venue in a maps app, so that I can find unfamiliar halls.
12. As a member, I want past matches to drop out of the default view, so that the calendar stays focused on what's coming.

### Personal links and members
13. As an admin, I want the app to generate a personal link when I add a member, so that they can use the app without creating an account.
14. As an admin, I want a ready-to-send WhatsApp message containing a member's link, so that I can send it to them privately in seconds.
15. As an admin, I want to regenerate a member's link, so that a leaked or lost link stops working.
16. As a member, I want to open my personal link and immediately see my upcoming events, so that responding takes one tap.
17. As a member, I want to add the app to my home screen, so that it feels like an app and I don't need to find the WhatsApp message again.
18. As an admin, I want to deactivate a member who has left the club, so that they disappear from line-ups and lists while their history is kept.
19. As a captain or admin, I want to sign in with an emailed magic link, so that the extra powers I have are better protected than a personal link.

### Match responses
20. As a member, I want to answer yes, maybe or no for each match, so that captains know whether I can play.
21. As a member, I want to answer for matches of other teams too, so that captains know I'm available as a substitute.
22. As a member, I want to change my answer at any time, so that it stays accurate when my plans change.
23. As a member, I want to see which matches I haven't answered yet, so that I don't leave captains waiting.
24. As a captain, I want to see, for each of my matches, who said yes, maybe, no, or hasn't answered, so that I can plan the line-up.
25. As a captain, I want to see available members from other teams, so that I can find substitutes without asking in the chat.

### Line-ups and substitutes
26. As a captain, I want to pick the 4 players for a match from the available members, so that the line-up is recorded in one place.
27. As a captain, I want to pick a substitute from any team, so that I can complete the line-up when my own players are missing.
28. As a member, I want to see when I've been put in a line-up, so that I know I'm playing.
29. As a captain, I want a warning when a player is in two line-ups on the same evening, so that we don't double-book anyone.
30. As a captain, I want a warning when I put in a player who answered no or maybe, so that I don't rely on someone by mistake.
31. As a captain, I want a match to turn red with "spot open" when a line-up player changes their answer to no, so that I notice right away.
32. As a captain, I want a push notification when a player drops out of my line-up (if I've opted in), so that I can react before match day.
33. As a captain, I want the app to never swap players automatically, so that substitutions stay my decision.
34. As an admin, I want to act as captain for any team, so that I can cover when a captain is away.

### Reschedules
35. As a captain or admin, I want to change a match's date and time, so that the calendar reflects reschedules.
36. As a member, I want my yes or maybe on a rescheduled match to turn into "please reconfirm", so that old answers don't pass as current ones.
37. As a captain, I want a rescheduled match to show that its line-up needs attention, so that I recheck availability.

### Clash detection
38. As an admin, I want to set how many tables the club has (8) and how many each home match takes (2 for play + 1 for space), so that the table maths matches reality.
39. As an admin, I want to set the minimum number of tables a training session needs to still count as viable, so that warnings match what we consider a problem.
40. As a member, I want evenings with clashes highlighted in the calendar, so that problems are visible early.
41. As an admin, I want to see when home matches on the same evening leave too few tables for training, so that I can plan or cancel training.

### Training sessions
42. As an admin, I want to define a recurring training rule (e.g. Tue and Thu 18:00–20:00), so that sessions appear automatically.
43. As an admin, I want to cancel a single session (holiday, hall closed), so that members don't turn up for nothing.
44. As a member, I want to tap "in" or "out" for a training session, so that others know whether I'm coming.
45. As a member, I want to see how many people are coming and how many tables are free that evening, so that I know whether it's worth going.
46. As a member, I want a session's free-table count to drop when home matches take tables, so that the number is accurate.

### Reminders
47. As a captain, I want a "copy reminder for WhatsApp" button that lists who hasn't answered for a match, so that chasing takes seconds.
48. As an admin, I want a ready-to-paste message for the group with a match or training link, so that sharing events is quick.
49. As a member, I want to opt in to push notifications from the installed PWA, so that I get reminders without relying on the group chat.
50. As a member, I want to opt out of push notifications, so that I control what I receive.

### Language
51. As a foreign member, I want the app in English, so that I can use it comfortably.
52. As a member, I want my language choice saved with my profile, so that it applies on every device I open my link on.
53. As a first-time visitor without a saved preference, I want the app to use my device's language, so that it starts in the right language.
54. As a member, I want to switch language at any time, so that I can change my mind.

## Implementation Decisions

**Stack**
- SvelteKit (server-side rendering, PWA) with SQLite, deployed on one small VPS or Fly.io.
- All UI text lives in translation files (Czech and English) from day one.
- Language resolution order: the member's saved preference, then the preference saved on this device, then the browser's language, then Czech.

**Modules**
- **Club core**: the single in-process API holding all domain behaviour. Commands and queries cover: import a season (fixtures and rosters, as already-parsed data), manage members, teams and personal links, record a response, set a line-up, reschedule a match, define and cancel training rules and sessions, read the calendar with clash flags, list who hasn't answered for an event. The UI routes are thin and only call this API.
- **STIS adapter**: turns the STIS CSV fixture export and the HTML of the club's STIS page (team rosters) into plain fixture and roster records. It knows nothing about the database or the club core. STIS is getting a new version, so everything specific to STIS stays inside this adapter.
- **Notifier**: a port with a web-push implementation. The club core emits notification intents (e.g. "spot open in line-up X") and the notifier delivers them.
- **Clock**: a port, so "today" and "upcoming" are deterministic in tests.

**Domain model**: see `CONTEXT.md` at the repo root for the glossary.

**Rules**
- Re-importing is idempotent: matches are keyed by their fixture key (competition + home + away; the STIS export has no match id, see ADR 0002). Fixtures that changed in STIS are reported, not applied, unless the admin asks for it.
- Rescheduling a match turns all yes and maybe answers for it into "please reconfirm" and marks its line-up as needing attention.
- When a line-up player changes their answer to no, the slot shows as open and the captain is notified. Nothing is swapped automatically.
- Clash checks run per evening:
  - a player in two line-ups;
  - home matches × tables per match exceeding the club's table count;
  - tables left for training falling below the configured minimum.
- Settings per club: total tables (8), tables per home match (3), minimum tables for viable training.
- Line-ups have no player order; the captain only picks 4 players.
- League rules (e.g. registration limits on substitutes) are not enforced.

**Access**
- Personal links carry a long random token that identifies the member. Regenerating the token invalidates the old link. Personal links are never shown in group-chat messages.
- Captains and admins sign in with an emailed magic link to get captain or admin powers. A plain personal link only ever allows member actions.

## Testing Decisions

- Good tests check external behaviour through the highest seam: what goes into the club core and what comes out (calendar entries, clash flags, response states, notification intents). They don't assert on internal tables or helper functions.
- **Club core** (main seam): tested through its public API against a real SQLite database in memory, with a fixed clock and a fake notifier that records intents. This covers import idempotency, the reschedule → reconfirm rule, drop-out → spot open + notification, all clash checks, training generation and cancellation, link regeneration, and language resolution.
- **STIS adapter**: tested on saved real STIS files (the CSV export and the club page HTML) checked into the repo as test fixtures. Includes a test that a malformed file fails loudly without returning partial data.
- **Playwright smoke tests** (only a few): open a personal link → answer a match; captain signs in → sets a line-up. They prove the wiring, not the behaviour.
- The club core test harness (in-memory database, fixed clock, fake notifier) was set up in ticket 01; every later ticket reuses it.

## Out of Scope

- The public directory of halls and clubs (parked as a later way to grow).
- Table booking at halls, and integration with hall booking systems (e.g. Rezervujse).
- Club fees and payments (to raise with the chairman after v1).
- Enforcing league rules for substitutes and line-up order.
- Posting into WhatsApp automatically or running an unofficial WhatsApp bot.
- Email reminders to members, and collecting members' emails.
- A sign-up flow for other clubs, and billing.
- Tournaments and finding playing partners.
- Entering match results (STIS remains the place for results).
- Keeping the schedule in sync with STIS automatically after the first import (reschedules are entered by hand).

## Further Notes

- Pod Juliskou is run by ÚTVS ČVUT and takes bookings through cvut.rezervujse.cz or by phone (sources from 2019–2022, so this may have changed). That's why the original booking pilot idea was dropped in favour of starting with the club.
- Table maths: with 8 tables and 3 per match, two home matches leave 2 tables in theory, but the club reports usually having only 1. The settings must let the admin match reality.
- The club name suggests older members, so keep the interface simple with large tap targets: personal links over accounts, and one tap to answer.
- Success for v1: all 4 captains use it for line-ups instead of WhatsApp. Show step 1 to the captains early, since one captain who keeps using WhatsApp makes the calendar unreliable.
- Future directions recorded during the session: a public venue and club directory (bilingual, server-rendered for search engines) as the way new players find clubs; training attendance feeding into it; fees for the chairman; outreach to other clubs once the club workflow is proven.
