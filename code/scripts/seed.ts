/**
 * Seeds a development database with Mladí Veteráni, its 4 teams and a few matches around today.
 * Usage: DATABASE_PATH=data/prague-pong.db npm run seed
 * Real fixtures arrive through the STIS import (ticket 02); this is demo data only.
 */
import { databasePath, openDatabase } from '../src/lib/server/db/open';
import { seedBuilders } from '../src/lib/server/db/seed-builders';

const path = databasePath();
const db = openDatabase(path);

if (db.prepare('SELECT 1 FROM clubs WHERE slug = ?').get('mladi-veterani')) {
	console.log('Already seeded:', path);
	process.exit(0);
}

const seed = seedBuilders(db);
const club = seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
const teams = ['A', 'B', 'C', 'D'].map((name) => seed.team({ clubId: club.id, name }));
const home = seed.venue({ name: 'Pod Juliskou (ČVUT)', address: 'Pod Juliskou 4, 160 00 Praha 6' });
const away = seed.venue({ name: 'Herna Sokol (demo)', address: 'Demo 1, Praha' });

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const at = (daysFromNow: number, utcHour: number) => {
	const d = new Date(Date.now() + daysFromNow * MS_PER_DAY);
	d.setUTCHours(utcHour, 0, 0, 0);
	return d.toISOString().replace('.000Z', 'Z');
};

const fixtures: [teamIndex: number, opponent: string, isHome: boolean, daysFromNow: number][] = [
	[0, 'TJ Sokol Řepy C', true, 2],
	[1, 'SK Dejvice B', false, 4],
	[2, 'Slavoj Praha D', true, 7],
	[3, 'AC Demo A', false, 9],
	[0, 'Spartak Demo E', true, 14]
];
for (const [teamIndex, opponent, isHome, daysFromNow] of fixtures) {
	seed.match({
		clubId: club.id,
		teamId: teams[teamIndex].id,
		venueId: isHome ? home.id : away.id,
		opponent,
		isHome,
		startsAt: at(daysFromNow, 17)
	});
}
console.log(`Seeded ${path}: ${club.name} with ${fixtures.length} matches`);
