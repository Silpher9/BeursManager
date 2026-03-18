import { expect, test } from '@playwright/test';

import { createArtwork, createContact, createFair } from './helpers';

test.describe('Contacts', () => {
  test('shows hero card with title and Toevoegen button', async ({ page }) => {
    await page.goto('/contacts');

    await expect(page.getByText('Contacten', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toevoegen' })).toBeVisible();

    await page.getByRole('button', { name: 'Toevoegen' }).click();
    await expect(page).toHaveURL(/\/contacts\/new$/);
  });

  test('shows validation error when name is empty', async ({ page }) => {
    await page.goto('/contacts/new');

    await page.getByPlaceholder('emma@example.com').fill('test@example.com');
    await page.getByRole('button', { name: 'Contact opslaan' }).click();

    await expect(page.getByText('Naam is verplicht.')).toBeVisible();
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.goto('/contacts/new');

    await page.getByPlaceholder('Bijv. Emma Jansen').fill('Test Contact');
    await page.getByPlaceholder('emma@example.com').fill('geen-email');
    await page.getByRole('button', { name: 'Contact opslaan' }).click();

    await expect(page.getByText('Voer een geldig e-mailadres in.')).toBeVisible();
  });

  test('can create contact with specific type', async ({ page }) => {
    const contactName = `PW Galeriehouder ${Date.now()}`;

    await page.goto('/contacts/new');

    await page.getByPlaceholder('Bijv. Emma Jansen').fill(contactName);
    await page.getByPlaceholder('emma@example.com').fill('galerie@example.com');
    await page.getByPlaceholder('+31 6 12345678').fill('+31612345678');
    await page.getByText('Galeriehouder', { exact: true }).click();
    await page.getByRole('button', { name: 'Contact opslaan' }).click();

    await expect(page).toHaveURL(/\/contacts$/);
    await expect(page.getByText(contactName)).toBeVisible();
  });

  test('can navigate to contact detail and see info', async ({ page }) => {
    const contactName = `PW Detail ${Date.now()}`;

    await createContact(page, {
      name: contactName,
      email: 'detail@test.com',
      phone: '+31600000001',
    });

    // createContact leaves us on the detail page
    await expect(page).toHaveURL(/\/contacts\/[^/]+$/);

    // Verify key elements on the detail page
    await expect(page.getByRole('heading', { name: contactName })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bewerken' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Verwijderen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Interesse toevoegen' })).toBeVisible();
  });

  test('can search contacts by name', async ({ page }) => {
    const ts = Date.now();
    const nameA = `PW Alpha ${ts}`;
    const nameB = `PW Beta ${ts}`;

    await createContact(page, { name: nameA });
    await createContact(page, { name: nameB });

    await page.goto('/contacts');
    await page.getByPlaceholder('Zoek op naam, e-mail of telefoon').fill(nameA);

    await expect(page.getByText(nameA)).toBeVisible();
    await expect(page.getByText(nameB)).not.toBeVisible();
  });

  test('can filter contacts by type', async ({ page }) => {
    const ts = Date.now();
    const koperName = `PW Koper ${ts}`;
    const galeriehouderName = `PW Galeriehouder ${ts}`;

    // Create a koper
    await page.goto('/contacts/new');
    await page.getByPlaceholder('Bijv. Emma Jansen').fill(koperName);
    await page.getByText('Koper', { exact: true }).click();
    await page.getByRole('button', { name: 'Contact opslaan' }).click();
    await expect(page).toHaveURL(/\/contacts$/);

    // Create a galeriehouder
    await page.goto('/contacts/new');
    await page.getByPlaceholder('Bijv. Emma Jansen').fill(galeriehouderName);
    await page.getByText('Galeriehouder', { exact: true }).click();
    await page.getByRole('button', { name: 'Contact opslaan' }).click();
    await expect(page).toHaveURL(/\/contacts$/);

    // Both should be visible initially
    await expect(page.getByText(koperName)).toBeVisible();
    await expect(page.getByText(galeriehouderName)).toBeVisible();

    // Filter by Koper — use first() since "Koper" also appears as type label in cards
    await page.getByText('Koper', { exact: true }).first().click();

    await expect(page.getByText(koperName)).toBeVisible();
    await expect(page.getByText(galeriehouderName)).not.toBeVisible();

    // Reset by clicking "Alles"
    await page.getByText('Alles', { exact: true }).click();

    await expect(page.getByText(koperName)).toBeVisible();
    await expect(page.getByText(galeriehouderName)).toBeVisible();
  });

  test('can edit contact from detail screen', async ({ page }) => {
    const ts = Date.now();
    const originalName = `PW EditOrig ${ts}`;
    const updatedName = `PW EditUpdated ${ts}`;

    await createContact(page, { name: originalName });

    // We're on the detail page — click edit
    await page.getByRole('button', { name: 'Bewerken' }).click();
    await expect(page).toHaveURL(/\/contacts\/.+\/edit$/);

    // Update name
    const nameField = page.getByPlaceholder('Bijv. Emma Jansen');
    await nameField.clear();
    await nameField.fill(updatedName);
    await page.getByRole('button', { name: 'Contact opslaan' }).click();

    // router.back() navigates away from /edit — wait for that to complete
    await expect(page).not.toHaveURL(/\/edit$/);

    // Verify the update persisted by loading the contacts list fresh
    await page.goto('/contacts', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(updatedName)).toBeVisible();
    await expect(page.getByText(originalName)).not.toBeVisible();
  });

  test('can delete contact from detail screen', async ({ page }) => {
    const contactName = `PW Delete ${Date.now()}`;

    await createContact(page, { name: contactName });

    // We're on the detail page
    await expect(page).toHaveURL(/\/contacts\/[^/]+$/);

    // Accept the confirm dialog (confirmAction uses window.confirm on web)
    page.on('dialog', (dialog) => dialog.accept());

    await page.getByRole('button', { name: 'Verwijderen' }).click();

    // Should navigate to contacts list
    await expect(page).toHaveURL(/\/contacts$/);

    // Contact should no longer appear
    await expect(page.getByText(contactName)).not.toBeVisible();
  });

  test('can add an artwork interest from detail screen', async ({ page }) => {
    const ts = Date.now();
    const artworkTitle = `PW Interest Art ${ts}`;

    // Create an artwork first
    await createArtwork(page, { title: artworkTitle });

    // Create a contact
    await createContact(page, { name: `PW Interest ${ts}` });

    // We're on the detail page — verify empty interest state
    await expect(page.getByText('Nog geen interesses vastgelegd.')).toBeVisible();

    // Open the interest picker — scroll into view first
    const addInterestBtn = page.getByRole('button', { name: 'Interesse toevoegen' });
    await addInterestBtn.scrollIntoViewIfNeeded();
    await addInterestBtn.click();

    // Wait for the picker modal search input (use getByPlaceholder, not getByText)
    await expect(page.getByPlaceholder('Zoek op titel of kunstenaar')).toBeVisible();
    await expect(page.getByText(artworkTitle)).toBeVisible();

    // Select the artwork
    await page.getByText(artworkTitle).click();

    // Verify the interest now appears on the detail page
    await expect(page.getByText('Nog geen interesses vastgelegd.')).not.toBeVisible();
    await expect(page.getByText(artworkTitle)).toBeVisible();
  });

  test('shows stats in hero card even with zero contacts', async ({ page }) => {
    await page.goto('/contacts');

    await expect(page.getByText('totaal')).toBeVisible();
    await expect(page.getByText('kopers')).toBeVisible();
    await expect(page.getByText('geïnteresseerd')).toBeVisible();
    await expect(page.getByText('galeriehouders')).toBeVisible();
  });

  test('can filter contacts by fair and shows year suffix in dropdown', async ({ page }) => {
    const ts = Date.now();

    // Maak een beurs aan (createFair zet start_date ~30 dagen in de toekomst)
    const fairName = `PW Beurs ${ts}`;
    const fairId = await createFair(page, { name: fairName });

    // Maak contact met fairId (redirects naar fair day view na opslaan)
    const contactWithFair = `PW FairContact ${ts}`;
    await page.goto(`/contacts/new?fairId=${fairId}`);
    await page.getByPlaceholder('Bijv. Emma Jansen').fill(contactWithFair);
    await page.getByRole('button', { name: 'Contact opslaan' }).click();
    await expect(page).toHaveURL(/\/fairs\/.+\/day$/);

    // Maak contact zonder fair
    const contactWithoutFair = `PW NoFairContact ${ts}`;
    await page.goto('/contacts/new');
    await page.getByPlaceholder('Bijv. Emma Jansen').fill(contactWithoutFair);
    await page.getByRole('button', { name: 'Contact opslaan' }).click();
    await expect(page).toHaveURL(/\/contacts$/);

    // Navigeer naar contactenlijst
    await page.goto('/contacts');

    // Dropdown moet zichtbaar zijn
    await expect(page.getByText('Alle beurzen')).toBeVisible();

    // Open dropdown — controleer dat beursnaam met jaartal-suffix wordt getoond
    await page.getByText('Alle beurzen').click();
    const currentYear = new Date().getFullYear().toString();
    const expectedLabel = new RegExp(`PW Beurs ${ts}.*\\(${currentYear}\\)`);
    await expect(page.getByText(expectedLabel)).toBeVisible();

    // Selecteer beurs in de modal
    await page.getByText(expectedLabel).click();

    // Alleen fair-contact zichtbaar
    await expect(page.getByText(contactWithFair)).toBeVisible();
    await expect(page.getByText(contactWithoutFair)).not.toBeVisible();

    // Reset: open dropdown opnieuw (first = trigger, niet modal-optie) en kies "Alle beurzen"
    await page.getByText(expectedLabel).first().click();
    await page.getByText('Alle beurzen').click();

    // Beide weer zichtbaar
    await expect(page.getByText(contactWithFair)).toBeVisible();
    await expect(page.getByText(contactWithoutFair)).toBeVisible();
  });
});
