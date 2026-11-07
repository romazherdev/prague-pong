/**
 * STIS adapter: the per-team "CSV export kalendáře utkání" from stis.ping-pong.cz.
 *
 * Turns the export into plain fixture records. Knows nothing about the database or the club core,
 * and keeps everything STIS-specific (encoding, column names, "Home - Away" descriptions) in here.
 */

export type StisFixture = {
	/** Stable identity of the fixture across re-imports: competition + home + away (see ADR 0002). */
	fixtureKey: string;
	/** STIS competition code, e.g. "5TMB" (5. třída muži, skupina B). */
	competition: string;
	/** The club's team letter, e.g. "A". */
	teamName: string;
	opponent: string;
	isHome: boolean;
	venue: { name: string; address: string };
	/** Wall-clock time at the venue (Prague), "YYYY-MM-DDTHH:mm". Not UTC. */
	startsLocal: string;
	endsLocal: string;
};

export class StisParseError extends Error {
	override name = 'StisParseError';
}

const EXPECTED_HEADER = [
	'Subject',
	'Start Date',
	'Start Time',
	'End Date',
	'End Time',
	'All Day Event',
	'Description',
	'Location',
	'Private'
];

/**
 * Parses one STIS calendar export. `clubTeamPrefix` is the club's team name without the team letter,
 * e.g. "TJ Mladí Veteráni - VSK ČVUT"; each match must involve "<prefix> <letter>".
 * Throws StisParseError (and returns nothing) if any part of the file can't be understood.
 */
export function parseStisFixtureCsv(bytes: Uint8Array, opts: { clubTeamPrefix: string }): StisFixture[] {
	const rows = parseCsv(decode(bytes));
	const [header, ...body] = rows;
	if (!header || header.map((h) => h.trim()).join('|') !== EXPECTED_HEADER.join('|')) {
		throw new StisParseError('Not a STIS calendar export: unexpected header row');
	}

	const fixtures = body
		.map((cells, index) => ({ cells, line: index + 2 }))
		.filter(({ cells }) => !(cells.length === 1 && cells[0].trim() === ''))
		.map(({ cells, line }) => parseRow(cells, line, opts.clubTeamPrefix));

	if (fixtures.length === 0) throw new StisParseError('The export contains no matches');
	return fixtures;
}

function parseRow(cells: string[], line: number, prefix: string): StisFixture {
	const fail = (reason: string): never => {
		throw new StisParseError(`line ${line}: ${reason}`);
	};
	if (cells.length !== EXPECTED_HEADER.length) fail(`expected ${EXPECTED_HEADER.length} columns, got ${cells.length}`);
	const [subject, startDate, startTime, endDate, endTime, , description, location] = cells.map((c) => c.trim());

	const competition = /^Utkání\s+(\S+)$/.exec(subject)?.[1] ?? fail(`unexpected subject "${subject}"`);
	const sides = splitSides(description, prefix) ?? fail(`"${description}" is not a match of a "${prefix} …" team`);
	if (!location) fail('missing location');

	return {
		fixtureKey: `${competition}|${sides.home}|${sides.away}`,
		competition,
		teamName: sides.teamName,
		opponent: sides.opponent,
		isHome: sides.isHome,
		venue: { name: location.split(',')[0].trim(), address: location },
		startsLocal: localDateTime(startDate, startTime) ?? fail(`invalid start "${startDate} ${startTime}"`),
		endsLocal: localDateTime(endDate, endTime) ?? fail(`invalid end "${endDate} ${endTime}"`)
	};
}

/**
 * "Home - Away", where either team name may itself contain " - ". The club's own team is recognised
 * by its prefix at the start (home) or end (away) of the description.
 */
function splitSides(description: string, prefix: string) {
	const ours = new RegExp(`^${escapeRegExp(prefix)} (\\S+)$`);
	const parts = description.split(' - ');
	for (let i = 1; i < parts.length; i++) {
		const home = parts.slice(0, i).join(' - ');
		const away = parts.slice(i).join(' - ');
		const homeTeam = ours.exec(home)?.[1];
		const awayTeam = ours.exec(away)?.[1];
		if (homeTeam && !awayTeam) return { home, away, teamName: homeTeam, opponent: away, isHome: true };
		if (awayTeam && !homeTeam) return { home, away, teamName: awayTeam, opponent: home, isHome: false };
	}
	return undefined;
}

/** "13/11/2026" + "18:15" → "2026-11-13T18:15", or undefined if it isn't a real date and time. */
function localDateTime(date: string, time: string): string | undefined {
	const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
	const t = /^(\d{2}):(\d{2})$/.exec(time);
	if (!d || !t) return undefined;
	const [, day, month, year] = d.map(Number);
	const [, hour, minute] = t.map(Number);
	const check = new Date(Date.UTC(year, month - 1, day, hour, minute));
	if (check.getUTCDate() !== day || check.getUTCMonth() !== month - 1 || hour > 23 || minute > 59) return undefined;
	return `${d[3]}-${d[2]}-${d[1]}T${t[1]}:${t[2]}`;
}

/** STIS exports in windows-1250; accept UTF-8 too in case a file was re-saved. */
function decode(bytes: Uint8Array): string {
	let text: string;
	try {
		text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		text = new TextDecoder('windows-1250').decode(bytes);
	}
	return text.replace(/^﻿/, '');
}

/** Minimal RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c === '"' && text[i + 1] === '"') {
				field += '"';
				i++;
			} else if (c === '"') quoted = false;
			else field += c;
		} else if (c === '"') quoted = true;
		else if (c === ',') {
			row.push(field);
			field = '';
		} else if (c === '\n' || c === '\r') {
			if (c === '\r' && text[i + 1] === '\n') i++;
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else field += c;
	}
	if (field !== '' || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
