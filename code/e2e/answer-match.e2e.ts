import { expect, test } from '@playwright/test';
import { state } from './state';

test('a member opens their personal link, answers a match, and the answer is still there after a reload', async ({ page }) => {
	const { clubSlug, petrLink } = state();

	await page.goto(petrLink);
	await expect(page).toHaveURL(`/${clubSlug}/me`);
	await expect(page.getByRole('heading', { name: 'Ahoj Petr' })).toBeVisible();

	const first = page.locator('li.event').filter({ hasText: 'Sokol Řepy C' });
	await first.getByRole('button', { name: 'Ano' }).click();
	await expect(first.getByRole('button', { name: 'Ano' })).toHaveAttribute('aria-pressed', 'true');

	await page.reload();
	const afterReload = page.locator('li.event').filter({ hasText: 'Sokol Řepy C' });
	await expect(afterReload.getByRole('button', { name: 'Ano' })).toHaveAttribute('aria-pressed', 'true');
	await expect(afterReload.getByRole('button', { name: 'Ne' })).toHaveAttribute('aria-pressed', 'false');
});
