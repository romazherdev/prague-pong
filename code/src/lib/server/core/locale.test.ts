import { describe, expect, it } from 'vitest';
import { createTestCore } from './testing';

describe('resolveLocale', () => {
	const { core } = createTestCore({ now: '2026-11-10T14:00:00Z' });

	it("prefers the language saved on this device", () => {
		expect(core.resolveLocale({ devicePreference: 'en', acceptLanguage: 'cs-CZ,cs;q=0.9' })).toBe('en');
	});

	it("falls back to the browser's language when nothing is saved", () => {
		expect(core.resolveLocale({ acceptLanguage: 'en-GB,en;q=0.9,cs;q=0.8' })).toBe('en');
	});

	it('picks the highest-weighted supported browser language', () => {
		expect(core.resolveLocale({ acceptLanguage: 'de-DE,de;q=0.9,cs;q=0.5,en;q=0.4' })).toBe('cs');
	});

	it('defaults to Czech when nothing matches', () => {
		expect(core.resolveLocale({ acceptLanguage: 'de-DE,fr;q=0.8' })).toBe('cs');
		expect(core.resolveLocale({})).toBe('cs');
	});

	it('skips languages the browser marks as not acceptable (q=0)', () => {
		expect(core.resolveLocale({ acceptLanguage: 'en;q=0, de' })).toBe('cs');
	});

	it('ignores an unsupported saved preference', () => {
		expect(core.resolveLocale({ devicePreference: 'xx', acceptLanguage: 'en' })).toBe('en');
	});
});
