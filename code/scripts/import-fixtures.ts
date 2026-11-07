/**
 * Imports a season's fixtures from STIS calendar exports (one CSV per team).
 *
 * Usage:
 *   npm run import:fixtures -- --club mladi-veterani --club-name "Mladí Veteráni" \
 *     --team-prefix "TJ Mladí Veteráni - VSK ČVUT" team-A.csv team-B.csv team-C.csv team-D.csv
 *
 * The club is created if it doesn't exist yet (--club-name is then required). Safe to run again:
 * unchanged fixtures are skipped and moved ones are updated. Every file is parsed before anything
 * is written, so a broken file imports nothing.
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createClubCore } from '../src/lib/server/core/club-core';
import { systemClock } from '../src/lib/server/core/ports';
import { databasePath, openDatabase } from '../src/lib/server/db/open';
import { parseStisFixtureCsv, StisParseError } from '../src/lib/server/stis/fixture-csv';

const { values, positionals: files } = parseArgs({
	allowPositionals: true,
	options: {
		club: { type: 'string' },
		'club-name': { type: 'string' },
		'team-prefix': { type: 'string' }
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
		return parsed;
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

const result = core.importSeasonFixtures(club.id, fixtures);
console.log(
	`${club.name}: ${result.added} added, ${result.updated} updated, ${result.unchanged} unchanged (${databasePath()})`
);
