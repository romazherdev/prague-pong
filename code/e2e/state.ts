import { readFileSync } from 'node:fs';

/** What e2e/seed.ts set up. */
export const state = () =>
	JSON.parse(readFileSync('e2e/.data/state.json', 'utf8')) as { clubSlug: string; petrLink: string };
