import { expect, test } from '@playwright/test';
import { state } from './state';

test('a captain signs in, sets a line-up, and the member sees they are playing', async ({ browser }) => {
	const { clubSlug, petrLink, captainSignInLink } = state();

	const captain = await (await browser.newContext()).newPage();
	await captain.goto(captainSignInLink);
	await captain.getByRole('button', { name: 'Přihlásit se' }).click();
	await expect(captain.getByRole('link', { name: 'Odhlásit' }).or(captain.getByRole('button', { name: 'Odhlásit' }))).toBeVisible();

	await captain.goto(`/${clubSlug}/captain`);
	await captain.getByRole('link', { name: /TTC Praha F/ }).click();
	await expect(captain.getByRole('heading', { name: 'Sestava' })).toBeVisible();
	await captain.getByLabel(/Petr Novák/).check();
	await captain.getByRole('button', { name: 'Uložit sestavu' }).click();
	await expect(captain.getByText('Petr Novák zatím neodpověděl(a).')).toBeVisible();

	const member = await (await browser.newContext()).newPage();
	await member.goto(petrLink);
	const match = member.locator('li.event').filter({ hasText: 'TTC Praha F' });
	await expect(match.getByText('Hraješ')).toBeVisible();
});
