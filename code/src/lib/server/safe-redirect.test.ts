import { describe, expect, it } from 'vitest';
import { sameSitePath } from './safe-redirect';

describe('sameSitePath', () => {
	const origin = 'https://pong.example';

	it('keeps a path on this site, with its query', () => {
		expect(sameSitePath('/mladi-veterani?team=B', origin)).toBe('/mladi-veterani?team=B');
	});

	it.each(['//evil.com', '/\\evil.com', 'https://evil.com/x', 'evil', '', null])('refuses %j', (back) => {
		expect(sameSitePath(back, origin)).toBe('/');
	});
});
