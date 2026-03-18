import { Buffer } from 'node:buffer';
import { deflateSync } from 'node:zlib';

import { expect, test } from '@playwright/test';

import { createArtwork } from './helpers';

test.describe('Inventory', () => {
  test('shows custom ScreenHeader with title and Toevoegen button', async ({ page }) => {
    await page.goto('/inventory');

    await expect(page.getByRole('heading', { name: 'Voorraad' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toevoegen' })).toBeVisible();

    await page.getByRole('button', { name: 'Toevoegen' }).click();
    await expect(page).toHaveURL(/\/inventory\/new$/);
  });

  test('stores a resized artwork image and a smaller thumbnail variant', async ({ page }) => {
    const ts = Date.now();
    const title = `Pipeline ${ts}`;
    const artist = `Pipeline Artist ${ts}`;

    await page.goto('/inventory/new');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Kies foto' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'artwork-large.png',
      mimeType: 'image/png',
      buffer: createLargeArtworkPngBuffer(),
    });

    await page.getByPlaceholder('Bijv. Damon Bot').fill(artist);
    await page.getByPlaceholder('Bijv. Blauwe horizon').fill(title);
    await page.getByPlaceholder('Bijv. olieverf op doek').fill('Acryl');
    await page.getByPlaceholder('2026').fill('2025');
    await page.getByPlaceholder('100').fill('140');
    await page.getByPlaceholder('80').fill('100');
    await page.getByPlaceholder('3').fill('4');
    await page.getByPlaceholder('1250').fill('2400');
    await page.getByRole('button', { name: 'Kunstwerk opslaan' }).click();

    await expect(page).toHaveURL(/\/inventory\/(?!new)[^/]+$/);
    const detailNaturalWidth = await getLargestVisibleImageWidth(page);

    expect(detailNaturalWidth).toBeLessThanOrEqual(1600);
    expect(detailNaturalWidth).toBeGreaterThan(420);

    await page.goto('/inventory');
    await page.getByPlaceholder('Zoek op titel, kunstenaar, techniek of serie').fill(title);
    const artworkCard = page.getByText(title).locator('..').locator('..');
    const thumbnailNaturalWidth = await getLargestVisibleImageWidth(page, artworkCard);

    expect(thumbnailNaturalWidth).toBeLessThanOrEqual(420);
    expect(thumbnailNaturalWidth).toBeLessThan(detailNaturalWidth);
  });

  test('shows validation error when title is empty', async ({ page }) => {
    await page.goto('/inventory/new');

    await page.getByPlaceholder('Bijv. Damon Bot').fill('Some Artist');
    await page.getByRole('button', { name: 'Kunstwerk opslaan' }).click();

    await expect(page.getByText('Titel is verplicht.')).toBeVisible();
    await expect(page).toHaveURL(/\/inventory\/new$/);
  });

  test('shows validation error for invalid dimension', async ({ page }) => {
    await page.goto('/inventory/new');

    await page.getByPlaceholder('Bijv. Blauwe horizon').fill('Test Artwork');
    await page.getByPlaceholder('100').fill('-5');
    await page.getByRole('button', { name: 'Kunstwerk opslaan' }).click();

    await expect(page.getByText('Hoogte moet groter zijn dan 0.')).toBeVisible();
  });

  test('can edit an existing artwork', async ({ page }) => {
    const ts = Date.now();
    const originalTitle = `Original ${ts}`;
    const updatedTitle = `Updated ${ts}`;

    await createArtwork(page, { title: originalTitle });

    await page.getByRole('button', { name: 'Bewerken' }).click();
    await expect(page).toHaveURL(/\/inventory\/.+\/edit$/);

    const titleField = page.getByPlaceholder('Bijv. Blauwe horizon');
    await titleField.clear();
    await titleField.fill(updatedTitle);
    await page.getByRole('button', { name: 'Wijzigingen opslaan' }).click();

    await expect(page).toHaveURL(/\/inventory\/[^/]+$/);
    await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible();
  });

  test('shows vraagprijs KPI in hero card', async ({ page }) => {
    await createArtwork(page, { title: `KPI ${Date.now()}`, price: '1500' });

    await page.goto('/inventory');

    await expect(page.getByText('vraagprijs', { exact: true })).toBeVisible();
    await expect(page.getByText('werken totaal', { exact: true })).toBeVisible();
    await expect(page.getByText('beschikbaar', { exact: true })).toBeVisible();
    await expect(page.getByText('gereserveerd', { exact: true })).toBeVisible();
  });

  test('can search artworks by title', async ({ page }) => {
    const ts = Date.now();
    const alphaTitle = `Alpha ${ts}`;
    const betaTitle = `Beta ${ts}`;

    await createArtwork(page, { title: alphaTitle });
    await createArtwork(page, { title: betaTitle });

    await page.goto('/inventory');
    await page.getByPlaceholder('Zoek op titel, kunstenaar, techniek of serie').fill(alphaTitle);

    await expect(page.getByText(alphaTitle)).toBeVisible();
    await expect(page.getByText(betaTitle)).not.toBeVisible();
  });
});

function createLargeArtworkPngBuffer(width = 2400, height = 1800) {
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel + 1;
  const raw = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * stride;
    raw[rowOffset] = 0;

    for (let x = 0; x < width; x += 1) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      raw[pixelOffset] = Math.round((x / width) * 255);
      raw[pixelOffset + 1] = Math.round((y / height) * 255);
      raw[pixelOffset + 2] = 140;
      raw[pixelOffset + 3] = 255;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    createPngChunk('IHDR', header),
    createPngChunk('IDAT', deflateSync(raw, { level: 9 })),
    createPngChunk('IEND', Buffer.alloc(0)),
  ]);
}

async function getLargestVisibleImageWidth(
  page: import('@playwright/test').Page,
  scope?: import('@playwright/test').Locator
) {
  const container = scope ?? page;
  await expect(container.locator('img').first()).toBeVisible();

  const widths = await container.locator('img').evaluateAll((images) =>
    images
      .map((image) => {
        const element = image as HTMLImageElement;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 ? element.naturalWidth : 0;
      })
      .filter((width) => width > 0)
  );

  return Math.max(...widths);
}

function createPngChunk(type: string, data: Buffer) {
  const chunkType = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(calculateCrc32(Buffer.concat([chunkType, data])), 0);

  return Buffer.concat([length, chunkType, data, crc]);
}

function calculateCrc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
