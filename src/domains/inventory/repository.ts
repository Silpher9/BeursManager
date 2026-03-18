import { randomUUID } from 'expo-crypto';
import { type SQLiteDatabase } from 'expo-sqlite';

import {
  type Artwork,
  type ArtistOption,
  type ArtworkEditorValues,
  type ArtworkListFilters,
  type ArtworkStatus,
  artworkStatuses,
} from '@/src/domains/inventory/types';

type ArtworkRow = {
  id: string;
  artist_id: string | null;
  artist_name: string | null;
  photo_path: string | null;
  thumbnail_path: string | null;
  extra_photo_paths: string;
  title: string;
  height_cm: number | null;
  width_cm: number | null;
  depth_cm: number | null;
  asking_price: number | null;
  technique: string | null;
  year: number | null;
  series: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function listArtworks(db: SQLiteDatabase, filters: ArtworkListFilters = {}) {
  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  if (filters.status && filters.status !== 'all') {
    whereClauses.push('status = ?');
    params.push(filters.status);
  }

  if (filters.series && filters.series !== 'all') {
    whereClauses.push('series = ?');
    params.push(filters.series);
  }

  if (filters.artistId && filters.artistId !== 'all') {
    whereClauses.push('artworks.artist_id = ?');
    params.push(filters.artistId);
  }

  const whereStatement = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const rows = await db.getAllAsync<ArtworkRow>(
    `SELECT
        artworks.*,
        artists.name AS artist_name
     FROM artworks
     LEFT JOIN artists ON artists.id = artworks.artist_id
     ${whereStatement}
     ORDER BY datetime(artworks.updated_at) DESC`,
    params
  );

  return rows.map(mapArtworkRow);
}

export async function listArtworkSeries(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ series: string | null }>(
    `SELECT DISTINCT series
     FROM artworks
     WHERE series IS NOT NULL AND TRIM(series) != ''
     ORDER BY series COLLATE NOCASE ASC`
  );

  return rows.map((row) => row.series).filter((series): series is string => Boolean(series));
}

export async function listArtists(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<ArtistOption>(
    `SELECT id, name
     FROM artists
     ORDER BY name COLLATE NOCASE ASC`
  );

  return rows;
}

export async function getArtworkById(db: SQLiteDatabase, artworkId: string) {
  const row = await db.getFirstAsync<ArtworkRow>(
    `SELECT
        artworks.*,
        artists.name AS artist_name
     FROM artworks
     LEFT JOIN artists ON artists.id = artworks.artist_id
     WHERE artworks.id = ?`,
    [artworkId]
  );
  return row ? mapArtworkRow(row) : null;
}

export async function saveArtwork(
  db: SQLiteDatabase,
  values: ArtworkEditorValues,
  artworkId?: string
) {
  const id = artworkId ?? randomUUID();
  const now = new Date().toISOString();
  const parsedValues = normalizeArtworkValues(values);
  const artistId = await ensureArtistId(db, parsedValues.artistName, now);

  if (artworkId) {
    await db.runAsync(
      `UPDATE artworks
       SET artist_id = ?,
           photo_path = ?,
           thumbnail_path = ?,
           title = ?,
           height_cm = ?,
           width_cm = ?,
           depth_cm = ?,
           asking_price = ?,
           technique = ?,
           year = ?,
           series = ?,
           status = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        artistId,
        parsedValues.photoPath,
        parsedValues.thumbnailPath,
        parsedValues.title,
        parsedValues.heightCm,
        parsedValues.widthCm,
        parsedValues.depthCm,
        parsedValues.askingPrice,
        parsedValues.technique,
        parsedValues.year,
        parsedValues.series,
        parsedValues.status,
        now,
        id,
      ]
    );
  } else {
    await db.runAsync(
      `INSERT INTO artworks (
        id,
        artist_id,
        photo_path,
        thumbnail_path,
        extra_photo_paths,
        title,
        height_cm,
        width_cm,
        depth_cm,
        asking_price,
        technique,
        year,
        series,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        artistId,
        parsedValues.photoPath,
        parsedValues.thumbnailPath,
        JSON.stringify([]),
        parsedValues.title,
        parsedValues.heightCm,
        parsedValues.widthCm,
        parsedValues.depthCm,
        parsedValues.askingPrice,
        parsedValues.technique,
        parsedValues.year,
        parsedValues.series,
        parsedValues.status,
        now,
        now,
      ]
    );
  }

  return id;
}

export async function deleteArtwork(db: SQLiteDatabase, artworkId: string) {
  await db.runAsync('DELETE FROM artworks WHERE id = ?', [artworkId]);
}

function mapArtworkRow(row: ArtworkRow): Artwork {
  return {
    id: row.id,
    artistId: row.artist_id,
    artistName: row.artist_name,
    photoPath: row.photo_path,
    thumbnailPath: row.thumbnail_path,
    extraPhotoPaths: parseJsonArray(row.extra_photo_paths),
    title: row.title,
    heightCm: row.height_cm,
    widthCm: row.width_cm,
    depthCm: row.depth_cm,
    askingPrice: row.asking_price,
    technique: row.technique,
    year: row.year,
    series: row.series,
    status: asArtworkStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

function asArtworkStatus(value: string): ArtworkStatus {
  return artworkStatuses.includes(value as ArtworkStatus)
    ? (value as ArtworkStatus)
    : 'beschikbaar';
}

function normalizeArtworkValues(values: ArtworkEditorValues) {
  return {
    artistName: normalizeOptionalText(values.artistName),
    photoPath: values.photoPath,
    thumbnailPath: values.thumbnailPath,
    title: values.title.trim(),
    heightCm: parseOptionalNumber(values.heightCm),
    widthCm: parseOptionalNumber(values.widthCm),
    depthCm: parseOptionalNumber(values.depthCm),
    askingPrice: parseOptionalNumber(values.askingPrice),
    technique: normalizeOptionalText(values.technique),
    year: parseOptionalInteger(values.year),
    series: normalizeOptionalText(values.series),
    status: values.status,
  };
}

async function ensureArtistId(
  db: SQLiteDatabase,
  artistName: string | null,
  now: string
): Promise<string | null> {
  if (!artistName) {
    return null;
  }

  const existingArtist = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM artists WHERE name = ? COLLATE NOCASE',
    [artistName]
  );

  if (existingArtist) {
    return existingArtist.id;
  }

  const artistId = randomUUID();

  await db.runAsync(
    `INSERT INTO artists (id, name, created_at)
     VALUES (?, ?, ?)`,
    [artistId, artistName, now]
  );

  return artistId;
}

function normalizeOptionalText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseOptionalNumber(value: string) {
  const normalized = value.trim().replace(',', '.');

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInteger(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
