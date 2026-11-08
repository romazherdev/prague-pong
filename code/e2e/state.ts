import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** What e2e/seed.ts set up. */
export const state = () =>
	JSON.parse(readFileSync(join(import.meta.dirname, '.data', 'state.json'), 'utf8')) as {
		clubSlug: string;
		petrLink: string;
		captainSignInLink: string;
		adminSignInLink: string;
	};
