import { randomUUID } from 'expo-crypto';
import { type SQLiteDatabase } from 'expo-sqlite';

import {
  type Fair,
  type FairAssignmentItem,
  type FairEditorValues,
  type FairListItem,
} from '@/src/domains/fairs/types';

type FairRow = {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  assigned_artwork_count?: number;
};

type AssignmentRow = {
  artwork_id: string;
  title: string;
  artist_name: string | null;
  photo_path: string | null;
  thumbnail_path: string | null;
  status: string | null;
  asking_price: number | null;
  series: string | null;
  included: number | null;
  sold: number | null;
  sale_price: number | null;
};

export async function listFairs(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<FairRow>(
    `SELECT
        fairs.*,
        COUNT(fair_artworks.artwork_id) AS assigned_artwork_count
     FROM fairs
     LEFT JOIN fair_artworks
       ON fair_artworks.fair_id = fairs.id
      AND fair_artworks.included = 1
     GROUP BY fairs.id
     ORDER BY fairs.start_date IS NULL ASC, fairs.start_date ASC, fairs.created_at DESC`
  );

  return rows.map((row) => ({
    ...mapFairRow(row),
    assignedArtworkCount: row.assigned_artwork_count ?? 0,
  })) satisfies FairListItem[];
}

export async function getFairById(db: SQLiteDatabase, fairId: string) {
  const row = await db.getFirstAsync<FairRow>('SELECT * FROM fairs WHERE id = ?', fairId);
  return row ? mapFairRow(row) : null;
}

export async function saveFair(db: SQLiteDatabase, values: FairEditorValues, fairId?: string) {
  const id = fairId ?? randomUUID();
  const now = new Date().toISOString();
  const parsed = normalizeFairValues(values);

  if (fairId) {
    await db.runAsync(
      `UPDATE fairs
       SET name = ?,
           location = ?,
           start_date = ?,
           end_date = ?,
           notes = ?,
           updated_at = ?
       WHERE id = ?`,
      [parsed.name, parsed.location, parsed.startDate, parsed.endDate, parsed.notes, now, id]
    );
  } else {
    await db.runAsync(
      `INSERT INTO fairs (
        id,
        name,
        location,
        start_date,
        end_date,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, parsed.name, parsed.location, parsed.startDate, parsed.endDate, parsed.notes, now, now]
    );
  }

  return id;
}

export async function deleteFair(db: SQLiteDatabase, fairId: string) {
  await db.runAsync('DELETE FROM fairs WHERE id = ?', [fairId]);
}

export async function listFairAssignments(db: SQLiteDatabase, fairId: string) {
  const rows = await db.getAllAsync<AssignmentRow>(
    `SELECT
        artworks.id AS artwork_id,
        artworks.title,
        artists.name AS artist_name,
        artworks.photo_path,
        artworks.thumbnail_path,
        artworks.status,
        artworks.asking_price,
        artworks.series,
        fair_artworks.included,
        fair_artworks.sold,
        fair_artworks.sale_price
     FROM artworks
     LEFT JOIN artists ON artists.id = artworks.artist_id
     LEFT JOIN fair_artworks
       ON fair_artworks.artwork_id = artworks.id
      AND fair_artworks.fair_id = ?
     ORDER BY artworks.title COLLATE NOCASE ASC`,
    fairId
  );

  return rows.map((row) => ({
    artworkId: row.artwork_id,
    title: row.title,
    artistName: row.artist_name,
    photoPath: row.photo_path,
    thumbnailPath: row.thumbnail_path,
    status: row.status,
    askingPrice: row.asking_price,
    series: row.series,
    included: row.included === 1,
    sold: row.sold === 1,
    salePrice: row.sale_price,
  })) satisfies FairAssignmentItem[];
}

export async function setFairArtworkIncluded(
  db: SQLiteDatabase,
  fairId: string,
  artworkId: string,
  included: boolean
) {
  if (included) {
    await db.runAsync(
      `INSERT INTO fair_artworks (fair_id, artwork_id, included, sold, sale_price)
       VALUES (?, ?, 1, 0, NULL)
       ON CONFLICT(fair_id, artwork_id)
       DO UPDATE SET included = 1`,
      [fairId, artworkId]
    );
    return;
  }

  await db.runAsync(
    `DELETE FROM fair_artworks
     WHERE fair_id = ?
       AND artwork_id = ?`,
    [fairId, artworkId]
  );
}

function mapFairRow(row: FairRow): Fair {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeFairValues(values: FairEditorValues) {
  return {
    name: values.name.trim(),
    location: normalizeOptionalText(values.location),
    startDate: normalizeOptionalText(values.startDate),
    endDate: normalizeOptionalText(values.endDate),
    notes: normalizeOptionalText(values.notes),
  };
}

function normalizeOptionalText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
