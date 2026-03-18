import { expect, test } from '@playwright/test';

import { assignArtworkToFair, createArtwork, createFair } from './helpers';

/* ------------------------------------------------------------------ */
/* Journey 1: Beursdag → verkoop → context behouden                   */
/* ------------------------------------------------------------------ */
test.describe('Journey: Beursdag → verkoop → context behouden', () => {
  test('sale during fair day preserves context and updates metrics', async ({ page }) => {
    const ts = Date.now();
    const artworkTitle = `PW Journey1 ${ts}`;
    const fairName = `PW Journey1 Fair ${ts}`;

    // 1. Create artwork + fair, assign artwork to fair
    await createArtwork(page, { title: artworkTitle, price: '2500' });
    const fairId = await createFair(page, { name: fairName });
    await assignArtworkToFair(page, fairId, artworkTitle);

    // 2. Activate fair day mode
    await page.getByLabel('Beursdag aanzetten').click();
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/day`));
    await expect(page.getByText('Beursdag actief').first()).toBeVisible();

    // 3. Register a sale from the day screen
    await page.getByRole('button', { name: 'Verkoop registreren' }).click();
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/sales/new`));
    await expect(page.getByRole('heading', { name: 'Verkoop registreren' })).toBeVisible();

    // 4. Save with defaults (auto-selected artwork + asking price)
    await page.getByRole('button', { name: 'Verkoop opslaan' }).click();

    // 5. Lands on fair detail — banner should still be active
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}$`));
    await expect(page.getByText('Beursdag actief').first()).toBeVisible();

    // 6. Navigate back to day screen via sidebar
    await page.getByLabel('Beursdag overzicht').click();
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/day`));

    // 7. Verify metrics updated: status line shows 1 sale
    await expect(page.getByText(/1 gekoppeld, 1 verkocht/)).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/* Journey 2: Home Hub → verkoop → fair-context                       */
/* ------------------------------------------------------------------ */
test.describe('Journey: Home Hub → verkoop → fair-context', () => {
  test('quick action navigates to correct fair sale editor', async ({ page }) => {
    const ts = Date.now();
    const artworkTitle = `PW Journey2 ${ts}`;
    const fairName = `PW Journey2 Fair ${ts}`;

    // 1. Create artwork
    await createArtwork(page, { title: artworkTitle, price: '1800' });

    // 2. Create fair with future dates (inline, to guarantee upcoming status)
    const futureStart = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const futureEnd = new Date(Date.now() + 31 * 86_400_000).toISOString().slice(0, 10);
    await page.goto('/fairs/new');
    await page.getByPlaceholder('Bijv. Art The Hague 2026').fill(fairName);
    await page.getByPlaceholder('Bijv. Den Haag').fill('Utrecht');
    await page.getByPlaceholder('YYYY-MM-DD').nth(0).fill(futureStart);
    await page.getByPlaceholder('YYYY-MM-DD').nth(1).fill(futureEnd);
    await page.getByRole('button', { name: 'Beurs opslaan' }).click();
    await expect(page).toHaveURL(/\/fairs\/(?!new)[^/]+$/);
    const fairUrl = page.url();
    const fairId = fairUrl.split('/fairs/')[1]?.split(/[?#/]/)[0] ?? '';

    // 3. Assign artwork to fair
    await assignArtworkToFair(page, fairId, artworkTitle);

    // 4. Navigate to Home
    await page.goto('/');
    await expect(page.getByText('Snelle acties', { exact: true })).toBeVisible();

    // 5. Assert upcoming fair section shows our fair
    await expect(page.getByText('Actieve of eerstvolgende beurs', { exact: true })).toBeVisible();
    await expect(page.getByText(fairName)).toBeVisible();

    // 6. Click "Verkoop" inline action in cockpit card
    await page.getByRole('button', { name: 'Verkoop' }).click();

    // 7. Assert on correct fair's sale editor
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/sales/new`));
    await expect(page.getByRole('heading', { name: 'Verkoop registreren' })).toBeVisible();

    // 8. Assert assigned artwork is available as candidate
    await expect(page.getByText(artworkTitle, { exact: true })).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/* Journey 3: Beursdag → contact → return path + context              */
/* ------------------------------------------------------------------ */
test.describe('Journey: Beursdag → contact → return path', () => {
  test('adding contact during fair day returns to day screen with context', async ({ page }) => {
    const ts = Date.now();
    const fairName = `PW Journey3 Fair ${ts}`;
    const contactName = `PW Journey3 Contact ${ts}`;

    // 1. Create fair and navigate to its detail
    const fairId = await createFair(page, { name: fairName });
    await page.goto(`/fairs/${fairId}`);

    // 2. Activate fair day mode
    await page.getByLabel('Beursdag aanzetten').click();
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/day`));
    await expect(page.getByText('Beursdag actief').first()).toBeVisible();

    // 3. Click "Contact toevoegen" from fair day screen
    await page.getByRole('button', { name: 'Contact toevoegen' }).click();
    await expect(page).toHaveURL(/\/contacts\/new/);

    // 4. Verify fair context is carried into the contact form (fairId in URL query)
    await expect(page).toHaveURL(new RegExp(`fairId=${fairId}`));

    // 5. Fill contact name and save
    await page.getByPlaceholder('Bijv. Emma Jansen').fill(contactName);
    await page.getByRole('button', { name: 'Contact opslaan' }).click();

    // 6. Assert: back on fair day screen (not contacts list)
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/day`));

    // 7. Assert: "Beursdag actief" still visible (context preserved)
    await expect(page.getByText('Beursdag actief').first()).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/* Journey 4: Sidebar navigatie + actieve tab (tablet)                */
/* ------------------------------------------------------------------ */
test.describe('Journey: Sidebar navigatie + actieve tab', () => {
  test('sidebar navigation updates active tab correctly', async ({ page }) => {
    // 1. Open Home → assert sidebar visible
    await page.goto('/');
    await expect(page.locator('[role="tab"]').filter({ hasText: 'Home' })).toBeVisible();

    // Helper to get a sidebar tab
    const tab = (name: string) => page.locator('[role="tab"]').filter({ hasText: name });

    // 2. Navigate to Voorraad
    await tab('Voorraad').click();
    await expect(page).toHaveURL(/\/inventory/);
    await expect(tab('Voorraad')).toHaveAttribute('aria-selected', 'true');
    await expect(tab('Home')).toHaveAttribute('aria-selected', 'false');

    // 3. Navigate to Beurzen
    await tab('Beurzen').click();
    await expect(page).toHaveURL(/\/fairs/);
    await expect(tab('Beurzen')).toHaveAttribute('aria-selected', 'true');
    await expect(tab('Voorraad')).toHaveAttribute('aria-selected', 'false');

    // 4. Navigate to Contacten
    await tab('Contacten').click();
    await expect(page).toHaveURL(/\/contacts/);
    await expect(tab('Contacten')).toHaveAttribute('aria-selected', 'true');
    await expect(tab('Beurzen')).toHaveAttribute('aria-selected', 'false');

    // 5. Navigate back to Home
    await tab('Home').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(tab('Home')).toHaveAttribute('aria-selected', 'true');
    await expect(tab('Contacten')).toHaveAttribute('aria-selected', 'false');
  });
});
