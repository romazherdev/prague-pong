/**
 * A same-site path to go back to after a form post, or `/`. Parses the value against the site's origin and
 * keeps only path and query, so "//evil.com", "/\evil.com" or full URLs can't send people elsewhere.
 */
export function sameSitePath(back: unknown, origin: string): string {
	if (typeof back !== 'string' || !back.startsWith('/')) return '/';
	try {
		const url = new URL(back, origin);
		return url.origin === origin ? url.pathname + url.search : '/';
	} catch {
		return '/';
	}
}
