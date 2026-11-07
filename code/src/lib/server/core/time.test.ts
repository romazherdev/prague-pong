import { describe, expect, it } from 'vitest';
import { utcToWallClock, wallClockToUtc } from './time';

const PRAGUE = 'Europe/Prague';

describe('wall clock ↔ UTC in Prague', () => {
	it('converts both ways in winter and summer time', () => {
		expect(wallClockToUtc('2026-11-18T19:00', PRAGUE)).toBe('2026-11-18T18:00:00Z');
		expect(wallClockToUtc('2026-07-01T19:00', PRAGUE)).toBe('2026-07-01T17:00:00Z');
		expect(utcToWallClock('2026-11-18T18:00:00Z', PRAGUE)).toBe('2026-11-18T19:00');
		expect(utcToWallClock('2026-07-01T17:00:00Z', PRAGUE)).toBe('2026-07-01T19:00');
	});

	it('round-trips the hours right around both DST switches', () => {
		for (const local of ['2026-03-29T01:59', '2026-03-29T03:00', '2026-10-25T01:59', '2026-10-25T03:00']) {
			expect(utcToWallClock(wallClockToUtc(local, PRAGUE), PRAGUE)).toBe(local);
		}
	});

	it('picks one real instant for the repeated hour in October', () => {
		const utc = wallClockToUtc('2026-10-25T02:30', PRAGUE);
		expect(['2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z']).toContain(utc);
		expect(utcToWallClock(utc, PRAGUE)).toBe('2026-10-25T02:30');
	});
});
