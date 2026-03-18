import { expect, test } from '@playwright/test';

import { createContact } from './helpers';

test.describe('Journey smoke: contact breadcrumb return paths', () => {
  test('detail and edit screens keep breadcrumb context and explicit return paths', async ({ page }) => {
    const contactName = `PW Contact Breadcrumb ${Date.now()}`;
    const contactId = await createContact(page, { name: contactName });

    await expect(page).toHaveURL(new RegExp(`/contacts/${contactId}$`));
    await expect(page.getByRole('heading', { name: contactName })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Contacten' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bewerken' })).toBeVisible();

    await page.getByRole('button', { name: 'Bewerken' }).click();

    await expect(page).toHaveURL(new RegExp(`/contacts/${contactId}/edit$`));
    await expect(page.getByRole('heading', { name: 'Contact bewerken' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Contacten' })).toBeVisible();
    await expect(page.getByRole('button', { name: contactName })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Annuleren' })).toBeVisible();

    await page.getByRole('button', { name: 'Annuleren' }).click();

    await expect(page).toHaveURL(new RegExp(`/contacts/${contactId}$`));
    await expect(page.getByRole('heading', { name: contactName })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bewerken' })).toBeVisible();

    await page.getByRole('button', { name: 'Contacten' }).click();

    await expect(page).toHaveURL(/\/contacts$/);
    await expect(page.getByText('Contacten', { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(contactName, { exact: true }).filter({ visible: true }).first()
    ).toBeVisible();
  });
});
