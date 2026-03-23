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

export async function deleteStandConfig(
  db: SQLiteDatabase,
  fairId: string,
): Promise<void> {
  await db.runAsync('DELETE FROM stand_configurations WHERE fair_id = ?', fairId);
}
