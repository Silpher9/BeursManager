import type { SQLiteDatabase } from 'expo-sqlite';

import type { Vec3, WallConfig } from './types';

export type StandDocument = {
  walls: Array<WallConfig & { position: Vec3; rotation: Vec3 }>;
};

export async function saveStandConfig(
  db: SQLiteDatabase,
  fairId: string,
  config: StandDocument,
): Promise<void> {
  const json = JSON.stringify(config);
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO stand_configurations (fair_id, config_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(fair_id) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at`,
    fairId,
    json,
    now,
  );
}

export async function loadStandConfig(
  db: SQLiteDatabase,
  fairId: string,
): Promise<StandDocument | null> {
  const row = await db.getFirstAsync<{ config_json: string }>(
    'SELECT config_json FROM stand_configurations WHERE fair_id = ?',
    fairId,
  );
  if (!row) return null;
  return JSON.parse(row.config_json) as StandDocument;
}

export type StandArtworkItem = {
  id: string;
  title: string;
  artistName: string | null;
  thumbnailPath: string | null;
  heightCm: number | null;
  widthCm: number | null;
  placeable: boolean;
};

export async function listFairArtworksForStand(
  db: SQLiteDatabase,
  fairId: string,
): Promise<StandArtworkItem[]> {
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    artist_name: string | null;
    thumbnail_path: string | null;
    height_cm: number | null;
    width_cm: number | null;
  }>(
    `SELECT artworks.id, artworks.title, artists.name AS artist_name,
            artworks.thumbnail_path, artworks.height_cm, artworks.width_cm
     FROM fair_artworks
     INNER JOIN artworks ON artworks.id = fair_artworks.artwork_id
     LEFT JOIN artists ON artists.id = artworks.artist_id
     WHERE fair_artworks.fair_id = ? AND fair_artworks.included = 1
     ORDER BY artists.name COLLATE NOCASE ASC, artworks.title COLLATE NOCASE ASC`,
    fairId,
  );

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    artistName: row.artist_name,
    thumbnailPath: row.thumbnail_path,
    heightCm: row.height_cm,
    widthCm: row.width_cm,
    placeable: row.height_cm != null && row.width_cm != null,
  }));
}

export async function deleteStandConfig(
  db: SQLiteDatabase,
  fairId: string,
): Promise<void> {
  await db.runAsync('DELETE FROM stand_configurations WHERE fair_id = ?', fairId);
}
