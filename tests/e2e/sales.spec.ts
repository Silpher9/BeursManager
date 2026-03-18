import { expect, test } from '@playwright/test';

import { assignArtworkToFair, createArtwork, createContact, createFair } from './helpers';

test.describe('Sales', () => {
  test('can register a sale for a fair', async ({ page }) => {
    const ts = Date.now();
    const artworkTitle = `PW Sale ${ts}`;
    const buyerName = `PW Buyer ${ts}`;

    await createArtwork(page, { title: artworkTitle, price: '1800' });
    const fairId = await createFair(page);
    await assignArtworkToFair(page, fairId, artworkTitle);

    await page.goto(`/fairs/${fairId}/sales/new`);

    // Wait for the sale editor to load with the artwork candidate
    await expect(page.getByRole('heading', { name: 'Verkoop registreren' })).toBeVisible();

    // Fill discount (use exact: true because "0" is a substring of placeholder "1250")
    await page.getByPlaceholder('0', { exact: true }).fill('200');

    // Select payment status and method
    await page.getByText('Betaald', { exact: true }).click();
    await page.getByText('Contant', { exact: true }).click();

    // Fill buyer name
    await page.getByPlaceholder('Naam koper').fill(buyerName);

    await page.getByRole('button', { name: 'Verkoop opslaan' }).click();

    // Should redirect back to fair detail
    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}$`));

    // Sale should be visible in the sales section
    await expect(page.getByText(artworkTitle).first()).toBeVisible();
  });

  test('shows validation when discount exceeds asking price', async ({ page }) => {
    const ts = Date.now();
    const artworkTitle = `PW DiscountErr ${ts}`;

    await createArtwork(page, { title: artworkTitle, price: '1000' });
    const fairId = await createFair(page);
    await assignArtworkToFair(page, fairId, artworkTitle);

    await page.goto(`/fairs/${fairId}/sales/new`);

    // Wait for the sale editor to load
    await expect(page.getByRole('heading', { name: 'Verkoop registreren' })).toBeVisible();

    // Set discount higher than asking price
    await page.getByPlaceholder('0', { exact: true }).fill('1500');
    await page.getByRole('button', { name: 'Verkoop opslaan' }).click();

    await expect(
      page.getByText('Korting kan niet hoger zijn dan de vraagprijs.')
    ).toBeVisible();
  });

  test('can edit an existing sale from detail view', async ({ page }) => {
    const ts = Date.now();
    const artworkTitle = `PW Sale Edit ${ts}`;
    const buyerName = `PW Detail Buyer ${ts}`;

    await createArtwork(page, { title: artworkTitle, price: '1800' });
    const fairId = await createFair(page);
    await assignArtworkToFair(page, fairId, artworkTitle);

    await page.goto(`/fairs/${fairId}/sales/new`);
    await expect(page.getByRole('heading', { name: 'Verkoop registreren' })).toBeVisible();

    await page.getByPlaceholder('Naam koper').fill(buyerName);
    await page.getByRole('button', { name: 'Verkoop opslaan' }).click();

    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}$`));
    await page.getByText(artworkTitle, { exact: true }).first().click();

    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}/sales/[^/]+$`));
    await page.getByRole('button', { name: 'Bewerken' }).click();
    await page.getByText('Deels betaald', { exact: true }).click();
    await page.getByRole('button', { name: 'Verkoop bijwerken' }).click();

    await expect(page.getByRole('button', { name: 'Bewerken' })).toBeVisible();
    await expect(page.getByText('Deels betaald', { exact: true })).toBeVisible();
  });

  test('can switch from an existing contact to a new buyer before saving', async ({ page }) => {
    const ts = Date.now();
    const artworkTitle = `PW Contact Switch ${ts}`;
    const existingContactName = `PW Existing Buyer ${ts}`;
    const newBuyerName = `PW New Buyer ${ts}`;

    await createArtwork(page, { title: artworkTitle, price: '1800' });
    const fairId = await createFair(page);
    await assignArtworkToFair(page, fairId, artworkTitle);
    await createContact(page, { name: existingContactName });

    await page.goto(`/fairs/${fairId}/sales/new`);
    await expect(page.getByRole('heading', { name: 'Verkoop registreren' })).toBeVisible();

    await page.getByText(existingContactName, { exact: true }).click();
    await page.getByPlaceholder('Naam koper').fill(newBuyerName);
    await page.getByRole('button', { name: 'Verkoop opslaan' }).click();

    await expect(page).toHaveURL(new RegExp(`/fairs/${fairId}$`));
    await expect(page.getByText(`Koper: ${newBuyerName}`, { exact: true })).toBeVisible();
  });
});
