# 04: Admin and captain sign-in by magic link

**What to build:** An admin or captain enters their email and receives a sign-in link. Following it starts a session with that role's powers. The first admin is created by a setup command.

**Blocked by:** 01

**Status:** claimed

- [ ] A setup command creates the first admin for a club (email address)
- [ ] Request a sign-in link by email; the link is single-use and expires
- [ ] A signed-in session carries the role (admin, or captain of a specific team)
- [ ] An admin can make a member the captain of a team and remove that role
- [ ] Routes for admins and captains reject requests that only have a personal link or no session (covered by tests through the core or the route layer)
- [ ] Email sending sits behind a port; tests use a fake that records sent links
