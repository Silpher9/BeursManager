import { expect, test } from '@playwright/test';

import { createFair } from './helpers';

test.describe('Home hub', () => {
  test('is the default landing page and opens a quick action', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Snelle acties', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nieuw kunstwerk' })).toBeVisible();

    await page.getByRole('button', { name: 'Nieuw kunstwerk' }).click();

    await expect(page).toHaveURL(/\/inventory\/new$/);
    await expect(page.getByRole('heading', { name: 'Nieuw kunstwerk' })).toBeVisible();
  });

  test('opens the active or upcoming fair from home', async ({ page }) => {
    const fairId = await createFair(page, { name: `PW Home Fair ${Date.now()}` });

    await page.goto('/');

    await expect(page.getByText('Actieve of eerstvolgende beurs', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Beurs beheren' }).click();

    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}$`));
  });

  test('shows fair progress card when a fair exists', async ({ page }) => {
    await createFair(page, { name: `PW Progress Fair ${Date.now()}` });

    await page.goto('/');

    await expect(page.getByText('Beursvoortgang', { exact: true })).toBeVisible();
    await expect(page.getByText('Nog geen werken gekoppeld')).toBeVisible();
  });
});
