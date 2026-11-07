/** Local calendar date (YYYY-MM-DD) of an instant in a time zone. */
export function localDate(instant: Date, timeZone: string): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
		instant
	);
}

/** Milliseconds the time zone is ahead of UTC at a given instant. */
function offsetAt(utcMs: number, timeZone: string): number {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone,
			hourCycle: 'h23',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		})
			.formatToParts(new Date(utcMs))
			.map((p) => [p.type, Number(p.value)])
	);
	const wallClockAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
	return wallClockAsUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * "2026-11-18T19:00" in `timeZone` → "2026-11-18T18:00:00Z".
 * Throws on anything that isn't a "YYYY-MM-DDTHH:mm" wall-clock time.
 */
export function wallClockToUtc(local: string, timeZone: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
	if (!m) throw new Error(`Not a local date-time: "${local}"`);
	const [, y, mo, d, h, mi] = m.map(Number);
	const asUtc = Date.UTC(y, mo - 1, d, h, mi);
	let utc = asUtc - offsetAt(asUtc, timeZone);
	utc = asUtc - offsetAt(utc, timeZone); // second pass settles instants near a DST switch
	return new Date(utc).toISOString().replace('.000Z', 'Z');
}
