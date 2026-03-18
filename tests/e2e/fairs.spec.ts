import { expect, test } from '@playwright/test';

import { createArtwork, createFair } from './helpers';

/**
 * Helper to click a button (by label) in the same assignment row as the given artwork title.
 * React Native Web renders deeply nested divs, so we walk up the DOM from the title text.
 */
async function clickAssignmentButton(page: import('@playwright/test').Page, artworkTitle: string, buttonLabel: string) {
  await page.evaluate(
    ({ title, label }) => {
      const allTextNodes = Array.from(document.querySelectorAll('[dir="auto"]'));
      for (const textNode of allTextNodes) {
        if (textNode.textContent?.trim() !== title) continue;
        let parent = textNode.parentElement;
        while (parent) {
          const btn = parent.querySelector('[role="button"]');
          if (btn instanceof HTMLElement && btn.textContent?.trim() === label) {
            btn.click();
            return;
          }
          parent = parent.parentElement;
        }
      }
    },
    { title: artworkTitle, label: buttonLabel }
  );
}

test.describe('Fairs', () => {
  test('shows page title in hero card and Nieuwe beurs button', async ({ page }) => {
    await page.goto('/fairs');

    await expect(page.getByText('Beurzen', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nieuwe beurs' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Nieuwe beurs' }).first().click();
    await expect(page).toHaveURL(/\/fairs\/new$/);
  });

  test('can assign artwork to fair', async ({ page }) => {
    const ts = Date.now();
    const artworkTitle = `PW Assign ${ts}`;

    await createArtwork(page, { title: artworkTitle });
    const fairId = await createFair(page);

    await page.goto(`/fairs/${fairId}`);
    await page.getByText('Kunstwerken koppelen').scrollIntoViewIfNeeded();
    await expect(page.getByText(artworkTitle, { exact: true }).first()).toBeVisible();

    await clickAssignmentButton(page, artworkTitle, 'Neem mee');

    await expect(page.getByText('Verwijder').first()).toBeVisible();
    await expect(page.getByText('1 werk gekoppeld')).toBeVisible();
  });

  test('can unassign artwork from fair', async ({ page }) => {
    const ts = Date.now();
    const artworkTitle = `PW Unassign ${ts}`;

    await createArtwork(page, { title: artworkTitle });
    const fairId = await createFair(page);

    await page.goto(`/fairs/${fairId}`);
    await page.getByText('Kunstwerken koppelen').scrollIntoViewIfNeeded();
    await expect(page.getByText(artworkTitle, { exact: true }).first()).toBeVisible();

    // Assign first
    await clickAssignmentButton(page, artworkTitle, 'Neem mee');
    await expect(page.getByText('1 werk gekoppeld')).toBeVisible();

    // Now unassign
    await clickAssignmentButton(page, artworkTitle, 'Verwijder');
    await expect(page.getByText('0 werken gekoppeld')).toBeVisible();
  });

  test('refreshes fair detail after editing and returning', async ({ page }) => {
    const ts = Date.now();
    const originalName = `PW Refresh ${ts}`;
    const updatedName = `PW Refresh Updated ${ts}`;
    const updatedLocation = 'Rotterdam';

    const fairId = await createFair(page, { name: originalName, location: 'Utrecht' });

    await page.goto(`/fairs/${fairId}`);
    await expect(page.getByText(originalName).first()).toBeVisible();

    await page.getByRole('button', { name: 'Bewerken' }).click();
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/edit$`));

    const nameField = page.getByPlaceholder('Bijv. Art The Hague 2026');
    await nameField.clear();
    await nameField.fill(updatedName);

    const locationField = page.getByPlaceholder('Bijv. Den Haag');
    await locationField.clear();
    await locationField.fill(updatedLocation);

    await page.getByRole('button', { name: 'Wijzigingen opslaan' }).click();

    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}$`));
    await expect(page.getByText(updatedName).first()).toBeVisible();
    await expect(page.getByText(updatedLocation)).toBeVisible();
  });

  test('can add an expense to a fair and see it in the totals', async ({ page }) => {
    const fairId = await createFair(page, { name: `PW Expense ${Date.now()}` });

    await page.goto(`/fairs/${fairId}`);
    await page.getByRole('button', { name: 'Nieuwe kostenpost' }).click();

    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/expenses/new$`));
    await page.getByText('Reiskosten').click();
    await page.getByPlaceholder('250').fill('250');
    await page.getByPlaceholder('Bijv. standhuur, parkeren, lunch...').fill('Parkeren en brandstof');
    await page.getByRole('button', { name: 'Kostenpost opslaan' }).click();

    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}$`));
    await expect(page.getByText('Parkeren en brandstof')).toBeVisible();
    await expect(page.getByText('€ 250').first()).toBeVisible();
  });
});
