import { expect, test } from '@playwright/test';

import { createFair } from './helpers';

test.describe('Fair child navigation shell', () => {
  test('shows breadcrumb context on expenses editor', async ({ page }) => {
    const fairName = `PW Fair Child ${Date.now()}`;
    const fairId = await createFair(page, { name: fairName });

    await page.goto(`/fairs/${fairId}/expenses/new`);

    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/expenses/new$`));
    await expect(page.getByRole('heading', { name: 'Nieuwe kostenpost' })).toBeVisible();
    await expect(page.getByRole('button', { name: fairName })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Beurzen' })).toBeVisible();
  });

  test('cancel returns to the fair detail from expenses editor', async ({ page }) => {
    const fairId = await createFair(page, { name: `PW Fair Cancel ${Date.now()}` });

    await page.goto(`/fairs/${fairId}/expenses/new`);
    await page.getByRole('button', { name: 'Annuleren' }).click();

    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}$`));
  });

  test('fair breadcrumb link returns to the fair detail from expenses editor', async ({ page }) => {
    const fairName = `PW Fair Breadcrumb ${Date.now()}`;
    const fairId = await createFair(page, { name: fairName });

    await page.goto(`/fairs/${fairId}/expenses/new`);
    await page.getByRole('button', { name: fairName }).click();

    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}$`));
  });

  test('shows breadcrumb on fair detail page', async ({ page }) => {
    const fairName = `PW Fair Detail ${Date.now()}`;
    const fairId = await createFair(page, { name: fairName });

    await page.goto(`/fairs/${fairId}`);

    await expect(page.getByRole('button', { name: 'Beurzen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bewerken' })).toBeVisible();
    await expect(page.getByText(fairName).first()).toBeVisible();
  });

  test('breadcrumb on fair detail navigates to fairs list', async ({ page }) => {
    const fairId = await createFair(page, { name: `PW Fair Back ${Date.now()}` });

    await page.goto(`/fairs/${fairId}`);
    await page.getByRole('button', { name: 'Beurzen' }).click();

    await expect(page).toHaveURL(/\/fairs$/);
  });

  test('edit button on fair detail navigates to edit screen', async ({ page }) => {
    const fairId = await createFair(page, { name: `PW Fair Edit ${Date.now()}` });

    await page.goto(`/fairs/${fairId}`);
    await page.getByRole('button', { name: 'Bewerken' }).click();

    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/edit$`));
  });

  test('shows breadcrumb on new fair screen', async ({ page }) => {
    await page.goto('/fairs/new');

    await expect(page.getByRole('heading', { name: 'Nieuwe beurs' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Beurzen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Annuleren' })).toBeVisible();
  });

  test('cancel on new fair returns to fairs list', async ({ page }) => {
    await page.goto('/fairs/new');
    await page.getByRole('button', { name: 'Annuleren' }).click();

    await expect(page).toHaveURL(/\/fairs$/);
  });

  test('shows breadcrumb with fair name on edit screen', async ({ page }) => {
    const fairName = `PW Fair EditBC ${Date.now()}`;
    const fairId = await createFair(page, { name: fairName });

    await page.goto(`/fairs/${fairId}/edit`);

    await expect(page.getByRole('heading', { name: 'Beurs bewerken' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Beurzen' })).toBeVisible();
    await expect(page.getByRole('button', { name: fairName })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Annuleren' })).toBeVisible();
  });

  test('cancel on edit fair returns to fair detail', async ({ page }) => {
    const fairId = await createFair(page, { name: `PW Fair EditCancel ${Date.now()}` });

    await page.goto(`/fairs/${fairId}/edit`);
    await page.getByRole('button', { name: 'Annuleren' }).click();

    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}$`));
  });

  test('home quick action opens expenses editor with shell context', async ({ page }) => {
    const fairName = `PW Fair Quick ${Date.now()}`;
    const fairId = await createFair(page, { name: fairName });

    await page.goto('/');
    await expect(page.getByText('Actieve of eerstvolgende beurs', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Onkosten' }).click();

    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/expenses/new$`));
    await expect(page.getByRole('heading', { name: 'Nieuwe kostenpost' })).toBeVisible();
    await expect(page.getByRole('button', { name: fairName })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Annuleren' })).toBeVisible();
  });
});
