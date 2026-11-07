/**
 * Imports a season's fixtures from STIS calendar exports (one CSV per team).
 *
 * Usage:
 *   npm run import:fixtures -- --club mladi-veterani --club-name "Mladí Veteráni" \
 *     --team-prefix "TJ Mladí Veteráni - VSK ČVUT" team-A.csv team-B.csv team-C.csv team-D.csv
 *
 * The club is created if it doesn't exist yet (--club-name is then required). Safe to run again:
 * unchanged fixtures are skipped. Fixtures that changed in STIS (e.g. a new date) are listed but not
 * applied, because a moved match must be rescheduled so members reconfirm; pass --apply-changes to
 * update them anyway (fine while nobody has answered yet). Every file is parsed before anything is
 * written, so a broken file imports nothing.
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createClubCore, type FixtureImport } from '../src/lib/server/core/club-core';
import { systemClock } from '../src/lib/server/core/ports';
import { databasePath, openDatabase } from '../src/lib/server/db/open';
import { parseStisFixtureCsv, StisParseError } from '../src/lib/server/stis/fixture-csv';

const { values, positionals: files } = parseArgs({
	allowPositionals: true,
	options: {
		club: { type: 'string' },
		'club-name': { type: 'string' },
		'team-prefix': { type: 'string' },
		'apply-changes': { type: 'boolean', default: false }
	}
});

const slug = values.club;
const prefix = values['team-prefix'];
if (!slug || !prefix || files.length === 0) {
	console.error('Usage: npm run import:fixtures -- --club <slug> [--club-name <name>] --team-prefix <prefix> <file.csv>...');
	process.exit(2);
}

const fixtures = files.flatMap((file) => {
	try {
		const parsed = parseStisFixtureCsv(readFileSync(file), { clubTeamPrefix: prefix });
		console.log(`${file}: ${parsed.length} fixtures`);
		// The core has its own input type; map explicitly so the STIS ↔ core boundary stays visible.
		return parsed.map(
			(f): FixtureImport => ({
				fixtureKey: f.fixtureKey,
				competition: f.competition,
				teamName: f.teamName,
				opponent: f.opponent,
				isHome: f.isHome,
				venue: f.venue,
				startsLocal: f.startsLocal,
				endsLocal: f.endsLocal
			})
		);
	} catch (error) {
		if (error instanceof StisParseError) {
			console.error(`${file}: ${error.message}\nNothing was imported.`);
			process.exit(1);
		}
		throw error;
	}
});

const core = createClubCore({
	db: openDatabase(databasePath()),
	clock: systemClock,
	notifier: { send: () => {} }
});

let club = core.findClubBySlug(slug);
if (!club) {
	if (!values['club-name']) {
		console.error(`No club "${slug}" yet. Pass --club-name to create it.`);
		process.exit(2);
	}
	club = core.createClub({ name: values['club-name'], slug });
	console.log(`Created club ${club.name} (${club.slug})`);
}

const result = core.importSeasonFixtures(club.id, fixtures, { applyChanges: values['apply-changes'] });
console.log(
	`${club.name}: ${result.added} added, ${result.updated} updated, ${result.unchanged} unchanged (${databasePath()})`
);
if (result.changedNotApplied.length > 0) {
	console.log(`\n${result.changedNotApplied.length} fixtures changed in STIS and were NOT applied:`);
	for (const key of result.changedNotApplied) console.log(`  ${key}`);
	console.log('Reschedule them in the app, or re-run with --apply-changes if nobody has answered yet.');
}
