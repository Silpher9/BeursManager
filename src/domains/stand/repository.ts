import type { SQLiteDatabase } from 'expo-sqlite';

import type { LampDefaults, PlacedArtwork, PlacedLamp, Vec3, WallConfig } from './types';

export type StandDocument = {
  walls: Array<WallConfig & { position: Vec3; rotation: Vec3 }>;
  artworks?: PlacedArtwork[];
  lamps?: PlacedLamp[];
  lampTypeDefaults?: Record<string, LampDefaults>;
};

export type StandSetupItem = {
  id: number;
  fairId: string;
  name: string;
  updatedAt: string;
};

// --- Setup CRUD ---

export async function listSetups(
  db: SQLiteDatabase,
  fairId: string,
): Promise<StandSetupItem[]> {
  const rows = await db.getAllAsync<{ id: number; fair_id: string; name: string; updated_at: string }>(
    'SELECT id, fair_id, name, updated_at FROM stand_configurations WHERE fair_id = ? ORDER BY updated_at DESC',
    fairId,
  );
  return rows.map(r => ({ id: r.id, fairId: r.fair_id, name: r.name, updatedAt: r.updated_at }));
}

export async function createSetup(
  db: SQLiteDatabase,
  fairId: string,
  name: string,
  config?: StandDocument,
): Promise<number> {
  const json = JSON.stringify(config ?? { walls: [] });
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO stand_configurations (fair_id, name, config_json, updated_at) VALUES (?, ?, ?, ?)',
    fairId, name, json, now,
  );
  return result.lastInsertRowId;
}

export async function renameSetup(
  db: SQLiteDatabase,
  setupId: number,
  name: string,
): Promise<void> {
  await db.runAsync('UPDATE stand_configurations SET name = ? WHERE id = ?', name, setupId);
}

export async function duplicateSetup(
  db: SQLiteDatabase,
  setupId: number,
  newName: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ fair_id: string; config_json: string }>(
    'SELECT fair_id, config_json FROM stand_configurations WHERE id = ?',
    setupId,
  );
  if (!row) throw new Error('Setup not found');
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO stand_configurations (fair_id, name, config_json, updated_at) VALUES (?, ?, ?, ?)',
    row.fair_id, newName, row.config_json, now,
  );
  return result.lastInsertRowId;
}

export async function deleteSetup(
  db: SQLiteDatabase,
  setupId: number,
): Promise<void> {
  await db.runAsync('DELETE FROM stand_configurations WHERE id = ?', setupId);
}

// --- Config load/save (by setup ID) ---

export async function saveStandConfig(
  db: SQLiteDatabase,
  setupId: number,
  config: StandDocument,
): Promise<void> {
  const json = JSON.stringify(config);
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE stand_configurations SET config_json = ?, updated_at = ? WHERE id = ?',
    json, now, setupId,
  );
}

export async function loadStandConfig(
  db: SQLiteDatabase,
  setupId: number,
): Promise<StandDocument | null> {
  const row = await db.getFirstAsync<{ config_json: string }>(
    'SELECT config_json FROM stand_configurations WHERE id = ?',
    setupId,
  );
  if (!row) return null;
  return JSON.parse(row.config_json) as StandDocument;
}

// --- Artwork browser ---

export type StandArtworkItem = {
  id: string;
  title: string;
  artistName: string | null;
  series: string | null;
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
    series: string | null;
    thumbnail_path: string | null;
    height_cm: number | null;
    width_cm: number | null;
  }>(
    `SELECT artworks.id, artworks.title, artists.name AS artist_name,
            artworks.series, artworks.thumbnail_path, artworks.height_cm, artworks.width_cm
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
    series: row.series,
    thumbnailPath: row.thumbnail_path,
    heightCm: row.height_cm,
    widthCm: row.width_cm,
    placeable: row.height_cm != null && row.width_cm != null,
  }));
}
