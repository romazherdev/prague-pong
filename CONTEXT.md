# Prague Pong — domain glossary

A club organiser for table tennis clubs, starting with Mladí Veteráni (Prague). It runs alongside the club's WhatsApp group and takes the annoying coordination off it.

## Terms

- **Club** — an organisation with members and league teams (e.g. Mladí Veteráni). Club-owned records carry a `clubId`, so more clubs can be added without a migration. There is no club sign-up flow.
- **Venue** — a physical place with tables (e.g. Pod Juliskou). Shared: several clubs can play at one venue. In the UI it's called a hall / *herna*. Not club-scoped (ADR 0001).
- **Team** — one of a club's league teams (A–D), with a roster of members. Czech: *družstvo*.
- **Member** — a person in the club: role (member, captain of a team, admin), language preference, optional link to a STIS player, active/inactive.
- **Captain** — a member who builds their team's line-ups. **Admin** — manages members, teams, schedule and settings, and can act as captain for any team.
- **Sign-in link** — a single-use emailed link (magic link) that starts a **session** for an admin or captain. Captains and admins need an email on their member record for it.
- **Session** — a signed-in admin or captain on one device (cookie). Admin and captain powers need a session; a personal link never gives them.
- **Actor** — who is asking the club core to do something: a session or a personal link, plus the member. The core checks permissions from it (ADR 0003).
- **Personal link** — a member's private URL carrying a secret token; identifies them without a login and only ever allows member actions. Regenerating it invalidates the old one. Never posted in group chats.
- **Event** — anything members answer for. Two kinds:
  - **Match** — a league fixture (Czech: *utkání*): team, opponent, home or away, venue, start and end time, fixture key.
  - **Training session** — generated from a **training rule** (weekdays + times); can be cancelled.
- **Fixture key** — how an imported match is recognised on re-import: competition + home team + away team (ADR 0002). Not a STIS id; the export has none.
- **Response** — a member's answer to an event. Matches: yes / maybe / no, plus **please reconfirm** after a reschedule. Training: in / out.
- **Line-up** — the 4 players chosen for a match (Czech: *sestava*). No player order. Any active member from any team.
- **Substitute** — a line-up player from a different team than the match's team. Derived, not stored.
- **Spot open** — a line-up slot whose player changed their answer to no. Never filled automatically.
- **Clash** — an evening problem: a player in two line-ups, home matches needing more tables than the club has, or too few tables left for training.
- **STIS** — the Czech table tennis federation's results system; source of fixtures (CSV export) and team rosters (club page).

## Avoid

- "Booking" / "reservation" — the product doesn't book halls (that idea is parked).
- "Player" for app users — use **member**; "player" is fine for a STIS roster entry.
- "Hall" in code — use **venue**.
