import { expect, type Page } from '@playwright/test';

export async function createArtwork(
  page: Page,
  overrides?: { title?: string; artist?: string; price?: string }
): Promise<string> {
  const ts = Date.now();
  const title = overrides?.title ?? `PW Artwork ${ts}`;
  const artist = overrides?.artist ?? `PW Artist ${ts}`;
  const price = overrides?.price ?? '1800';

  await page.goto('/inventory/new');

  await page.getByPlaceholder('Bijv. Damon Bot').fill(artist);
  await page.getByPlaceholder('Bijv. Blauwe horizon').fill(title);
  await page.getByPlaceholder('Bijv. olieverf op doek').fill('Acryl');
  await page.getByPlaceholder('2026').fill(String(new Date().getFullYear()));
  await page.getByPlaceholder('100').fill('100');
  await page.getByPlaceholder('80').fill('80');
  await page.getByPlaceholder('3').fill('2');
  await page.getByPlaceholder('1250').fill(price);
  await page.getByRole('button', { name: 'Kunstwerk opslaan' }).click();

  await expect(page).toHaveURL(/\/inventory\/(?!new)[^/]+$/);
  const url = page.url();
  const id = url.split('/inventory/')[1]?.split(/[?#]/)[0] ?? '';
  return id;
}

export async function createFair(
  page: Page,
  overrides?: { name?: string; location?: string }
): Promise<string> {
  const ts = Date.now();
  const name = overrides?.name ?? `PW Fair ${ts}`;
  const location = overrides?.location ?? 'Utrecht';

  await page.goto('/fairs/new');

  await page.getByPlaceholder('Bijv. Art The Hague 2026').fill(name);
  await page.getByPlaceholder('Bijv. Den Haag').fill(location);
  const fairStart = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const fairEnd = new Date(Date.now() + 31 * 86_400_000).toISOString().slice(0, 10);
  await page.getByPlaceholder('YYYY-MM-DD').nth(0).fill(fairStart);
  await page.getByPlaceholder('YYYY-MM-DD').nth(1).fill(fairEnd);
  await page.getByRole('button', { name: 'Beurs opslaan' }).click();

  await expect(page).toHaveURL(/\/fairs\/(?!new)[^/]+$/);
  const url = page.url();
  const id = url.split('/fairs/')[1]?.split(/[?#/]/)[0] ?? '';
  return id;
}

export async function assignArtworkToFair(
  page: Page,
  fairId: string,
  artworkTitle: string
): Promise<void> {
  await page.goto(`/fairs/${fairId}`);

  // Scroll down to the "Kunstwerken koppelen" section
  await page.getByText('Kunstwerken koppelen').scrollIntoViewIfNeeded();

  // Wait for the artwork to appear
  await expect(page.getByText(artworkTitle, { exact: true }).first()).toBeVisible();

  // Click the "Neem mee" button in the same row as the artwork title.
  // React Native Web renders nested divs, so we walk up from the title text
  // to find the nearest container that also holds a "Neem mee" button.
  await page.evaluate((title) => {
    const allTextNodes = Array.from(document.querySelectorAll('[dir="auto"]'));
    for (const textNode of allTextNodes) {
      if (textNode.textContent?.trim() !== title) continue;
      let parent = textNode.parentElement;
      while (parent) {
        const btn = parent.querySelector('[role="button"]');
        if (btn instanceof HTMLElement && btn.textContent?.trim() === 'Neem mee') {
          btn.click();
          return;
        }
        parent = parent.parentElement;
      }
    }
  }, artworkTitle);

  // Verify the artwork now shows "Verwijder" instead of "Neem mee"
  await expect(page.getByText('Verwijder').first()).toBeVisible();
}

export async function createContact(
  page: Page,
  overrides?: { name?: string; email?: string; phone?: string }
): Promise<string> {
  const ts = Date.now();
  const name = overrides?.name ?? `PW Contact ${ts}`;

  await page.goto('/contacts/new');

  await page.getByPlaceholder('Bijv. Emma Jansen').fill(name);
  if (overrides?.email) {
    await page.getByPlaceholder('emma@example.com').fill(overrides.email);
  }
  if (overrides?.phone) {
    await page.getByPlaceholder('+31 6 12345678').fill(overrides.phone);
  }
  await page.getByRole('button', { name: 'Contact opslaan' }).click();

  await expect(page).toHaveURL(/\/contacts$/);

  // Navigate to detail to extract the contact ID
  await page.getByText(name).click();
  await expect(page).toHaveURL(/\/contacts\/[^/]+$/);
  const url = page.url();
  const id = url.split('/contacts/')[1]?.split(/[?#/]/)[0] ?? '';
  return id;
}
