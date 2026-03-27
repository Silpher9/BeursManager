import { type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

export const DATABASE_VERSION = 8;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentDbVersion = result?.user_version ?? 0;

  await db.execAsync('PRAGMA foreign_keys = ON;');
  if (Platform.OS !== 'web') {
    await db.execAsync('PRAGMA journal_mode = WAL;');
  }

  // Idempotent: altijd aanmaken als tabel ontbreekt (dev-builds kunnen schema-version en tabelset uit sync raken)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS stand_configurations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fair_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Hoofdsetup',
      config_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (fair_id) REFERENCES fairs(id) ON DELETE CASCADE
    );
  `);

  // Idempotent: fix schema drift (v7→v8)
  const scColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(stand_configurations)');
  if (!scColumns.some((col) => col.name === 'name')) {
    await db.execAsync(`ALTER TABLE stand_configurations ADD COLUMN name TEXT NOT NULL DEFAULT 'Hoofdsetup';`);
  }

  // Idempotent: remove UNIQUE constraint on fair_id if still present (v7 leftover)
  const indexes = await db.getAllAsync<{ name: string; unique: number }>(
    `PRAGMA index_list(stand_configurations)`
  );
  const hasUniqueOnFairId = indexes.some((idx) => idx.unique === 1);
  if (hasUniqueOnFairId) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS stand_configurations_v8 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fair_id TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT 'Hoofdsetup',
        config_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (fair_id) REFERENCES fairs(id) ON DELETE CASCADE
      );
      INSERT OR IGNORE INTO stand_configurations_v8 (id, fair_id, name, config_json, updated_at)
        SELECT id, fair_id, COALESCE(name, 'Hoofdsetup'), config_json, updated_at FROM stand_configurations;
      DROP TABLE stand_configurations;
      ALTER TABLE stand_configurations_v8 RENAME TO stand_configurations;
    `);
  }

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS artists (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS artworks (
        id TEXT PRIMARY KEY NOT NULL,
        artist_id TEXT,
        photo_path TEXT,
        thumbnail_path TEXT,
        extra_photo_paths TEXT NOT NULL DEFAULT '[]',
        title TEXT NOT NULL,
        height_cm REAL,
        width_cm REAL,
        depth_cm REAL,
        asking_price REAL,
        technique TEXT,
        year INTEGER,
        series TEXT,
        status TEXT NOT NULL CHECK(status IN ('beschikbaar', 'gereserveerd', 'ingepakt', 'op_beurs', 'verkocht')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS fairs (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        location TEXT,
        start_date TEXT,
        end_date TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS fair_artworks (
        fair_id TEXT NOT NULL,
        artwork_id TEXT NOT NULL,
        included INTEGER NOT NULL DEFAULT 0,
        sold INTEGER NOT NULL DEFAULT 0,
        sale_price REAL,
        PRIMARY KEY (fair_id, artwork_id),
        FOREIGN KEY (fair_id) REFERENCES fairs(id) ON DELETE CASCADE,
        FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY NOT NULL,
        fair_id TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('standhuur', 'reiskosten', 'verblijf', 'materiaal_stand', 'eten_drinken')),
        amount REAL NOT NULL,
        description TEXT,
        receipt_photo_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (fair_id) REFERENCES fairs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        type TEXT NOT NULL CHECK(type IN ('koper', 'geinteresseerde', 'galeriehouder', 'overig')),
        fair_id TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (fair_id) REFERENCES fairs(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY NOT NULL,
        fair_id TEXT NOT NULL,
        artwork_id TEXT NOT NULL,
        asking_price REAL,
        discount REAL NOT NULL DEFAULT 0,
        sale_price REAL NOT NULL,
        payment_status TEXT NOT NULL CHECK(payment_status IN ('betaald', 'nog_niet_betaald', 'deels_betaald')),
        payment_method TEXT NOT NULL CHECK(payment_method IN ('contant', 'pin', 'overschrijving', 'anders')),
        sold_at TEXT NOT NULL,
        contact_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (fair_id) REFERENCES fairs(id) ON DELETE CASCADE,
        FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS contact_artworks (
        contact_id TEXT NOT NULL,
        artwork_id TEXT NOT NULL,
        fair_id TEXT,
        notes TEXT,
        PRIMARY KEY (contact_id, artwork_id),
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
        FOREIGN KEY (fair_id) REFERENCES fairs(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_artworks_status ON artworks(status);
      CREATE INDEX IF NOT EXISTS idx_artworks_artist_id ON artworks(artist_id);
      CREATE INDEX IF NOT EXISTS idx_fair_artworks_artwork_id ON fair_artworks(artwork_id);
      CREATE INDEX IF NOT EXISTS idx_sales_fair_id ON sales(fair_id);
      CREATE INDEX IF NOT EXISTS idx_sales_artwork_id ON sales(artwork_id);
      CREATE INDEX IF NOT EXISTS idx_sales_contact_id ON sales(contact_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_fair_id ON expenses(fair_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_fair_id ON contacts(fair_id);
      CREATE INDEX IF NOT EXISTS idx_contact_artworks_artwork_id ON contact_artworks(artwork_id);
      CREATE INDEX IF NOT EXISTS idx_contact_artworks_fair_id ON contact_artworks(fair_id);
    `);
  }

  if (currentDbVersion < 2) {
    const contactsColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(contacts)');

    if (!contactsColumns.some((column) => column.name === 'fair_id')) {
      await db.execAsync(`
        ALTER TABLE contacts ADD COLUMN fair_id TEXT REFERENCES fairs(id) ON DELETE SET NULL;
      `);
    }

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_contacts_fair_id ON contacts(fair_id);
    `);
  }

  if (currentDbVersion < 3) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS artists (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        created_at TEXT NOT NULL
      );
    `);

    const artworkColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(artworks)');

    if (!artworkColumns.some((column) => column.name === 'artist_id')) {
      await db.execAsync(`
        ALTER TABLE artworks ADD COLUMN artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL;
      `);
    }

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_artworks_artist_id ON artworks(artist_id);
    `);
  }

  if (currentDbVersion < 4) {
    const artworkColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(artworks)');

    if (!artworkColumns.some((column) => column.name === 'thumbnail_path')) {
      await db.execAsync(`
        ALTER TABLE artworks ADD COLUMN thumbnail_path TEXT;
      `);
    }
  }

  if (currentDbVersion < 5) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS contact_artworks_new (
        contact_id TEXT NOT NULL,
        artwork_id TEXT NOT NULL,
        fair_id TEXT,
        notes TEXT,
        PRIMARY KEY (contact_id, artwork_id),
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
        FOREIGN KEY (fair_id) REFERENCES fairs(id) ON DELETE SET NULL
      );

      INSERT OR IGNORE INTO contact_artworks_new
        SELECT contact_id, artwork_id, fair_id, notes FROM contact_artworks;

      DROP TABLE IF EXISTS contact_artworks;

      ALTER TABLE contact_artworks_new RENAME TO contact_artworks;

      CREATE INDEX IF NOT EXISTS idx_contact_artworks_artwork_id ON contact_artworks(artwork_id);
      CREATE INDEX IF NOT EXISTS idx_contact_artworks_fair_id ON contact_artworks(fair_id);
    `);
  }

  if (currentDbVersion < 6) {
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_contact_artworks_fair_id ON contact_artworks(fair_id);
    `);
  }

  if (currentDbVersion < 8) {
    // Migrate stand_configurations: remove UNIQUE on fair_id, add name column
    // SQLite doesn't support DROP CONSTRAINT, so recreate the table
    const hasNameColumn = await db.getAllAsync<{ name: string }>('PRAGMA table_info(stand_configurations)');
    const nameExists = hasNameColumn.some((col) => col.name === 'name');

    if (!nameExists) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS stand_configurations_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fair_id TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT 'Hoofdsetup',
          config_json TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (fair_id) REFERENCES fairs(id) ON DELETE CASCADE
        );

        INSERT INTO stand_configurations_new (id, fair_id, name, config_json, updated_at)
          SELECT id, fair_id, 'Hoofdsetup', config_json, updated_at FROM stand_configurations;

        DROP TABLE IF EXISTS stand_configurations;

        ALTER TABLE stand_configurations_new RENAME TO stand_configurations;
      `);
    }
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
