/**
 * Makes someone an admin of a club, so they can sign in with an emailed link.
 * Usage: npm run setup:admin -- --club mladi-veterani --name "Jana Nováková" --email jana@example.cz
 * Safe to run again: an existing member with that email is made admin instead of duplicated.
 */
import { parseArgs } from 'node:util';
import { createClubCore } from '../src/lib/server/core/club-core';
import { systemClock } from '../src/lib/server/core/ports';
import { databasePath, openDatabase } from '../src/lib/server/db/open';
import { createMailer } from '../src/lib/server/mailer';

const { values } = parseArgs({
	options: { club: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } }
});
if (!values.club || !values.name || !values.email) {
	console.error('Usage: npm run setup:admin -- --club <slug> --name <name> --email <email>');
	process.exit(2);
}

const core = createClubCore({
	db: openDatabase(databasePath()),
	clock: systemClock,
	notifier: { send: () => {} },
	mailer: createMailer()
});
const club = core.findClubBySlug(values.club);
if (!club) {
	console.error(`No club "${values.club}". Create it with the fixture import first (npm run import:fixtures).`);
	process.exit(1);
}
const admin = core.setUpAdmin(club.id, { name: values.name, email: values.email });
console.log(`${admin.name} <${values.email.trim().toLowerCase()}> is an admin of ${club.name}. Sign in at /${club.slug}/sign-in`);
