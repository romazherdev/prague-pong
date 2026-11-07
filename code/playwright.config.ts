import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests: they prove the wiring (routes ↔ club core ↔ database), not the behaviour, which the
 * club-core tests cover. The web server seeds a fresh database first (e2e/seed.ts).
 * Run: npm run test:e2e   (set CHROME_PATH to use an installed Chrome instead of Playwright's browser)
 */
const PORT = 4174;

export default defineConfig({
	testDir: 'e2e',
	testMatch: '*.e2e.ts',
	fullyParallel: false,
	workers: 1,
	use: {
		baseURL: `http://localhost:${PORT}`,
		...devices['Pixel 7'],
		locale: 'cs-CZ',
		launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}
	},
	webServer: {
		command: `npx tsx e2e/seed.ts && npx vite dev --port ${PORT} --strictPort`,
		port: PORT,
		reuseExistingServer: false,
		env: { DATABASE_PATH: 'e2e/.data/e2e.db' }
	}
});
