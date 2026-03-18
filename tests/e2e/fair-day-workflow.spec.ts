import { expect, test } from '@playwright/test';

import { assignArtworkToFair, createArtwork, createFair } from './helpers';

test.describe('Fair day workflow', () => {
  test('full fair day workflow: assign, activate, sell, contact', async ({ page }) => {
    const ts = Date.now();
    const artworkTitle = `PW FairDay ${ts}`;
    const fairName = `PW FairDay Fair ${ts}`;
    const contactName = `PW FairDay Contact ${ts}`;

    // 1. Create artwork and fair
    await createArtwork(page, { title: artworkTitle, price: '2500' });
    const fairId = await createFair(page, { name: fairName });

    // 2. Assign artwork to fair
    await assignArtworkToFair(page, fairId, artworkTitle);

    // 3. Activate fair day mode
    await page.getByLabel('Beursdag aanzetten').click();
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/day`));
    await expect(page.getByText('Beursdag actief').first()).toBeVisible();

    // 4. Verify the day screen loaded with action buttons
    await expect(page.getByRole('button', { name: 'Verkoop registreren' })).toBeVisible();

    // 5. Register a sale from the day screen
    await page.getByRole('button', { name: 'Verkoop registreren' }).click();
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/sales/new`));

    // Wait for sale editor to load
    await expect(page.getByRole('heading', { name: 'Verkoop registreren' })).toBeVisible();

    // Keep defaults: asking price pre-filled, no discount, betaald + pin
    await page.getByRole('button', { name: 'Verkoop opslaan' }).click();

    // Redirects to fair detail — banner should still be active (no page.goto)
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}$`));
    await expect(page.getByText('Beursdag actief').first()).toBeVisible();

    // Navigate back to day screen via sidebar "Overzicht" button
    await page.getByLabel('Beursdag overzicht').click();
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/day`));

    // 6. Add contact via day screen's "Contact toevoegen" button
    await page.getByRole('button', { name: 'Contact toevoegen' }).click();
    await expect(page).toHaveURL(/\/contacts\/new/);

    await page.getByPlaceholder('Bijv. Emma Jansen').fill(contactName);
    await page.getByRole('button', { name: 'Contact opslaan' }).click();

    // Redirects back to fair day screen (because fairId context)
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/day`));

    // 7. Deactivate fair day via sidebar
    await page.getByLabel('Beursdag uitzetten sidebar').click();

    // Should be back on fair detail, fair day gone
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}$`));
    await expect(page.getByText('Beursdag actief')).toHaveCount(0);
  });
});
