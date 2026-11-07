/**
 * Fresh database for the smoke tests: a club with two teams, an admin, a member and upcoming matches.
 * Writes what the tests need to know (e.g. the member's personal link) to e2e/.data/state.json.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createClubCore } from '../src/lib/server/core/club-core';
import { systemClock } from '../src/lib/server/core/ports';
import { openDatabase } from '../src/lib/server/db/open';
import { seedBuilders } from '../src/lib/server/db/seed-builders';

const dir = 'e2e/.data';
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const db = openDatabase(`${dir}/e2e.db`);
const core = createClubCore({ db, clock: systemClock, notifier: { send() {} }, mailer: { send() {} } });
const seed = seedBuilders(db);

const club = core.createClub({ name: 'Mladí Veteráni', slug: 'e2e-club' });
const teamA = seed.team({ clubId: club.id, name: 'A' });
seed.team({ clubId: club.id, name: 'B' });
const venue = seed.venue({ name: 'Pod Juliskou', address: 'Pod Juliskou 4, Praha 6' });
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().replace(/\.\d+Z$/, 'Z');
seed.match({ clubId: club.id, teamId: teamA.id, venueId: venue.id, opponent: 'Sokol Řepy C', isHome: true, startsAt: inDays(7) });
seed.match({ clubId: club.id, teamId: teamA.id, venueId: venue.id, opponent: 'TTC Praha F', isHome: false, startsAt: inDays(14) });

const admin = core.setUpAdmin(club.id, { name: 'Jana Admin', email: 'jana@example.cz' });
const asAdmin = { via: 'session' as const, memberId: admin.id };
const petr = core.addMember(asAdmin, club.id, { name: 'Petr Novák' });
core.setMemberTeam(asAdmin, club.id, petr.id, teamA.id);
const petrLink = core.personalLinkMessage(asAdmin, club.id, petr.id, { origin: '', locale: 'cs' }).url;

writeFileSync(`${dir}/state.json`, JSON.stringify({ clubSlug: club.slug, petrLink }, null, 2));
console.log('e2e database seeded');
