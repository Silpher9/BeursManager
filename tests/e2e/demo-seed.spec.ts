import { expect, test } from '@playwright/test';

test.describe('Demo seed flow', () => {
  test('loads the expanded test dataset from settings', async ({ page }) => {
    test.setTimeout(2 * 60_000);

    await page.goto('/settings');

    await expect(page.getByText('Demo-data', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Voorbeelddata laden' }).click();

    await expect(
      page.getByText(
        /40 kunstwerken van 4 kunstenaars, 3 beurzen en 3 contacten geladen met voorbeeldafbeeldingen\./
      )
    ).toBeVisible({ timeout: 60_000 });

    await page.getByText('Voorraad').click();

    await expect(page.getByText('Eva de Winter', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Jonas Vermeer', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Noor van Loon', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Mila Hartman', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Morgenlicht', { exact: true })).toBeVisible();
    await expect(page.getByText('Schemeratlas', { exact: true })).toBeVisible();
    await expect(page.getByText('40', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('werken totaal', { exact: true })).toBeVisible();
  });
});
