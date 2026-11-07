import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseStisFixtureCsv, StisParseError } from './fixture-csv';

const PREFIX = 'TJ Mladí Veteráni - VSK ČVUT';
const fixtureFile = (name: string) => readFileSync(new URL(`./test-fixtures/${name}`, import.meta.url));

describe('parseStisFixtureCsv (real STIS calendar exports, windows-1250)', () => {
	it("reads team A's season: away match with Czech diacritics", () => {
		const fixtures = parseStisFixtureCsv(fixtureFile('team-A-5TMB.csv'), { clubTeamPrefix: PREFIX });

		expect(fixtures).toHaveLength(16);
		expect(fixtures[0]).toEqual({
			fixtureKey: '5TMB|TTC Praha E|TJ Mladí Veteráni - VSK ČVUT A',
			competition: '5TMB',
			teamName: 'A',
			opponent: 'TTC Praha E',
			isHome: false,
			venue: { name: 'Kokořínská 204/28', address: 'Kokořínská 204/28, Praha 8 - Ďáblice' },
			startsLocal: '2026-11-11T18:30',
			endsLocal: '2026-11-11T20:30'
		});
	});

	it('handles a home match against an opponent whose name contains " - "', () => {
		const fixtures = parseStisFixtureCsv(fixtureFile('team-A-5TMB.csv'), { clubTeamPrefix: PREFIX });

		expect(fixtures[1]).toMatchObject({
			fixtureKey: '5TMB|TJ Mladí Veteráni - VSK ČVUT A|TJ Sokol Suchdol - Sedlec C',
			opponent: 'TJ Sokol Suchdol - Sedlec C',
			isHome: true,
			venue: { name: 'Herna SC ČVUT Juliska', address: 'Herna SC ČVUT Juliska, Praha 6, Pod Juliskou 4' },
			startsLocal: '2026-11-18T19:00'
		});
	});

	it('handles an away match against an opponent whose name contains " - "', () => {
		const fixtures = parseStisFixtureCsv(fixtureFile('team-C-7TMB.csv'), { clubTeamPrefix: PREFIX });

		expect(fixtures[5]).toMatchObject({
			teamName: 'C',
			opponent: 'TJ Stadion Žižkov DDM Praha 3 - Ulita D',
			isHome: false,
			startsLocal: '2026-12-16T19:00'
		});
	});

	it('collapses repeated spaces in team names, so a tidied name in STIS keeps the same key', () => {
		const fixtures = parseStisFixtureCsv(fixtureFile('team-A-5TMB.csv'), { clubTeamPrefix: PREFIX });

		// The export spells this opponent "TJ ABC Braník  G" (two spaces)
		expect(fixtures[3]).toMatchObject({
			fixtureKey: '5TMB|TJ Mladí Veteráni - VSK ČVUT A|TJ ABC Braník G',
			opponent: 'TJ ABC Braník G'
		});
	});

	it('gives every fixture of every team a distinct key (each pairing is played home and away)', () => {
		const all = ['team-A-5TMB.csv', 'team-B-6TMA.csv', 'team-C-7TMB.csv', 'team-D-7TMA.csv'].flatMap((f) =>
			parseStisFixtureCsv(fixtureFile(f), { clubTeamPrefix: PREFIX })
		);

		expect(all).toHaveLength(16 + 16 + 19 + 19);
		expect(new Set(all.map((f) => f.fixtureKey)).size).toBe(all.length);
		expect(new Set(all.map((f) => f.teamName))).toEqual(new Set(['A', 'B', 'C', 'D']));
	});

	describe('fails loudly, with no partial result', () => {
		const header =
			'Subject,"Start Date","Start Time","End Date","End Time","All Day Event",Description,Location,Private\n';
		const row = (description: string, date = '11/11/2026') =>
			`"Utkání 5TMB",${date},18:30,${date},20:30,FALSE,"${description}","Somewhere 1, Praha",FALSE\n`;
		const utf8 = (s: string) => new TextEncoder().encode(s);

		it('rejects a file that is not a STIS calendar export', () => {
			expect(() => parseStisFixtureCsv(utf8('name,date\nx,y\n'), { clubTeamPrefix: PREFIX })).toThrow(StisParseError);
		});

		it("rejects a match that doesn't involve one of the club's teams, naming the line", () => {
			const csv = header + row('TTC Praha E - TJ Mladí Veteráni - VSK ČVUT A') + row('Other Club A - Another Club B');
			expect(() => parseStisFixtureCsv(utf8(csv), { clubTeamPrefix: PREFIX })).toThrow(/line 3/);
		});

		it('rejects an invalid date', () => {
			const csv = header + row('TTC Praha E - TJ Mladí Veteráni - VSK ČVUT A', '31/02/2026');
			expect(() => parseStisFixtureCsv(utf8(csv), { clubTeamPrefix: PREFIX })).toThrow(StisParseError);
		});

		it('rejects an all-day event (a match always has a start time)', () => {
			const csv = header + row('TTC Praha E - TJ Mladí Veteráni - VSK ČVUT A').replace('FALSE,"TTC', 'TRUE,"TTC');
			expect(() => parseStisFixtureCsv(utf8(csv), { clubTeamPrefix: PREFIX })).toThrow(/all-day/);
		});

		it('rejects an export with no matches', () => {
			expect(() => parseStisFixtureCsv(utf8(header), { clubTeamPrefix: PREFIX })).toThrow(StisParseError);
		});
	});
});
