import { expect, test } from '@playwright/test';

test.describe('Web smoke flows', () => {
  test('can create an artwork from inventory', async ({ page }) => {
    const title = `PW Artwork ${Date.now()}`;
    const artist = `PW Artist ${Date.now()}`;

    await page.goto('/inventory/new');

    await page.getByPlaceholder('Bijv. Damon Bot').fill(artist);
    await page.getByPlaceholder('Bijv. Blauwe horizon').fill(title);
    await page.getByPlaceholder('Bijv. olieverf op doek').fill('Acryl');
    await page.getByPlaceholder('2026').fill('2025');
    await page.getByPlaceholder('100').fill('100');
    await page.getByPlaceholder('80').fill('80');
    await page.getByPlaceholder('3').fill('2');
    await page.getByPlaceholder('1250').fill('1800');
    await page.getByRole('button', { name: 'Kunstwerk opslaan' }).click();

    await expect(page).toHaveURL(/\/inventory\/.+/);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByText(artist).first()).toBeVisible();
  });

  test('can create a contact from contacts', async ({ page }) => {
    const contactName = `PW Contact ${Date.now()}`;

    await page.goto('/contacts/new');

    await page.getByPlaceholder('Bijv. Emma Jansen').fill(contactName);
    await page.getByPlaceholder('emma@example.com').fill('pw-contact@example.com');
    await page.getByPlaceholder('+31 6 12345678').fill('+31612345678');
    await page.getByRole('button', { name: 'Contact opslaan' }).click();

    await expect(page).toHaveURL(/\/contacts$/);
    await expect(page.getByText(contactName)).toBeVisible();
  });

  test('fair day toggle stays active across navigation', async ({ page }) => {
    const fairName = `PW Fair ${Date.now()}`;

    await page.goto('/fairs/new');

    await page.getByPlaceholder('Bijv. Art The Hague 2026').fill(fairName);
    await page.getByPlaceholder('Bijv. Den Haag').fill('Utrecht');
    await page.getByPlaceholder('YYYY-MM-DD').nth(0).fill('2026-03-13');
    await page.getByPlaceholder('YYYY-MM-DD').nth(1).fill('2026-03-14');
    await page.getByRole('button', { name: 'Beurs opslaan' }).click();

    await expect(page).toHaveURL(/\/fairs\/.+/);
    await page.getByLabel('Beursdag aanzetten').click();
    await expect(page).toHaveURL(/\/fairs\/.+\/day/);
    await expect(page.getByText('Beursdag actief').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: fairName }).first()).toBeVisible();

    await page.getByText('Contacten').click();

    await expect(page).toHaveURL(/\/contacts$/);
    await expect(page.getByText('Beursdag actief').first()).toBeVisible();
    await expect(page.getByText(fairName).first()).toBeVisible();

    await page.getByLabel('Beursdag overzicht').click();
    await expect(page).toHaveURL(/\/fairs\/.+\/day/);

    await page.getByLabel('Beursdag uitzetten sidebar').click();

    await expect(page).toHaveURL(/\/fairs\/.+$/);
    await expect(page.getByText('Beursdag actief')).toHaveCount(0);
  });
});
