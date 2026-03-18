import { expect, test } from '@playwright/test';

import { createFair } from './helpers';

test.describe('Reports', () => {
  test('shows empty state when no fairs exist', async ({ page }) => {
    await page.goto('/reports');

    await expect(page.getByText('Nog geen rapportdata')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ga naar beurzen' })).toBeVisible();
  });

  test('shows report sections after creating a fair with expenses', async ({ page }) => {
    // Create a fair with an expense
    const fairId = await createFair(page, { name: `PW Report ${Date.now()}` });

    await page.goto(`/fairs/${fairId}`);
    await page.getByRole('button', { name: 'Nieuwe kostenpost' }).click();
    await page.getByText('Standhuur', { exact: true }).click();
    await page.getByPlaceholder('250').fill('350');
    await page.getByRole('button', { name: 'Kostenpost opslaan' }).click();
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}$`));

    // Navigate to reports
    await page.goto('/reports');

    // Verify summary section appears (not empty state)
    await expect(page.getByText('Overzicht')).toBeVisible();
    await expect(page.getByText('gem. omzet/beurs')).toBeVisible();

    // Verify per-fair section exists
    await expect(page.getByText('Omzet en kosten per beurs, gesorteerd op datum.')).toBeVisible();
  });
});
