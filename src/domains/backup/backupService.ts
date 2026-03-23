import JSZip from 'jszip';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  cacheDirectory,
  documentDirectory,
  readAsStringAsync,
  writeAsStringAsync,
  readDirectoryAsync,
  makeDirectoryAsync,
  moveAsync,
  copyAsync,
  deleteAsync,
  getInfoAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import { openDatabaseAsync, deleteDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import Constants from 'expo-constants';

import { DATABASE_VERSION } from '@/src/db/migrate';
import { triggerDatabaseReload } from '@/src/db/dbReload';
import type { BackupManifest, BackupProgress, BackupStats, BackupValidationResult } from './types';

const ARTWORK_IMAGE_DIR = `${documentDirectory}artwork-images/`;
const RECEIPT_IMAGE_DIR = `${documentDirectory}receipt-images/`;
const BACKUP_TEMP_DIR = `${cacheDirectory}backup-temp/`;
const ROLLBACK_DIR = `${cacheDirectory}backup-rollback/`;
const DATABASE_NAME = 'beursmanager.db';

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function exportBackup(
  db: SQLiteDatabase,
  onProgress: (progress: BackupProgress) => void,
): Promise<void> {
  onProgress({ phase: 'checkpoint', message: 'Database voorbereiden...' });
  await db.execAsync('PRAGMA wal_checkpoint(FULL)');

  onProgress({ phase: 'manifest', message: 'Gegevens verzamelen...' });
  const stats = await gatherBackupStats(db);

  const manifest: BackupManifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    dbVersion: DATABASE_VERSION,
    stats,
  };

  onProgress({ phase: 'packing', message: 'Backup aanmaken...' });
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const dbBase64 = await readAsStringAsync(db.databasePath, {
    encoding: EncodingType.Base64,
  });
  zip.file(DATABASE_NAME, dbBase64, { base64: true });

  await addDirectoryToZip(zip, 'artwork-images', ARTWORK_IMAGE_DIR);
  await addDirectoryToZip(zip, 'receipt-images', RECEIPT_IMAGE_DIR);

  const zipBase64 = await zip.generateAsync({ type: 'base64' });
  const today = new Date().toISOString().slice(0, 10);
  const zipFileName = `beursmanager-backup-${today}.zip`;
  const zipPath = `${cacheDirectory}${zipFileName}`;
  await writeAsStringAsync(zipPath, zipBase64, { encoding: EncodingType.Base64 });

  onProgress({ phase: 'sharing', message: 'Delen...' });
  await Sharing.shareAsync(zipPath, {
    mimeType: 'application/zip',
    UTI: 'public.zip-archive',
  });

  await deleteAsync(zipPath, { idempotent: true });
}

// ---------------------------------------------------------------------------
// Import — stap 1: kiezen en valideren
// ---------------------------------------------------------------------------

export async function pickAndValidateBackup(
  onProgress: (progress: BackupProgress) => void,
): Promise<BackupManifest | null> {
  onProgress({ phase: 'picking', message: 'Backup selecteren...' });

  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const zipUri = result.assets[0].uri;

  onProgress({ phase: 'unpacking', message: 'Backup uitpakken...' });
  await deleteAsync(BACKUP_TEMP_DIR, { idempotent: true });
  await makeDirectoryAsync(BACKUP_TEMP_DIR, { intermediates: true });

  const zipBase64 = await readAsStringAsync(zipUri, { encoding: EncodingType.Base64 });
  const zip = await JSZip.loadAsync(zipBase64, { base64: true });
  await extractZipToDirectory(zip, BACKUP_TEMP_DIR);

  onProgress({ phase: 'validating', message: 'Backup valideren...' });
  const validation = await validateBackup(BACKUP_TEMP_DIR);

  if (!validation.valid) {
    await deleteAsync(BACKUP_TEMP_DIR, { idempotent: true });
    throw new Error(validation.error);
  }

  return validation.manifest;
}

// ---------------------------------------------------------------------------
// Import — stap 2: daadwerkelijke restore
// ---------------------------------------------------------------------------

export async function performRestore(
  currentDbPath: string,
  onProgress: (progress: BackupProgress) => void,
): Promise<void> {
  onProgress({ phase: 'restoring', message: 'Data herstellen...' });

  // Rollback-positie klaarzetten
  await deleteAsync(ROLLBACK_DIR, { idempotent: true });
  await makeDirectoryAsync(ROLLBACK_DIR, { intermediates: true });

  try {
    // Huidige bestanden naar rollback verplaatsen
    await moveAsync({ from: currentDbPath, to: `${ROLLBACK_DIR}${DATABASE_NAME}` });
    // WAL/SHM sidecar bestanden opruimen (data is al geflusht door provider's closeAsync)
    await deleteAsync(`${currentDbPath}-wal`, { idempotent: true });
    await deleteAsync(`${currentDbPath}-shm`, { idempotent: true });

    const artworkDirInfo = await getInfoAsync(ARTWORK_IMAGE_DIR);
    if (artworkDirInfo.exists) {
      await moveAsync({ from: ARTWORK_IMAGE_DIR, to: `${ROLLBACK_DIR}artwork-images` });
    }

    const receiptDirInfo = await getInfoAsync(RECEIPT_IMAGE_DIR);
    if (receiptDirInfo.exists) {
      await moveAsync({ from: RECEIPT_IMAGE_DIR, to: `${ROLLBACK_DIR}receipt-images` });
    }

    // Backup-bestanden naar definitieve locaties verplaatsen
    await moveAsync({ from: `${BACKUP_TEMP_DIR}${DATABASE_NAME}`, to: currentDbPath });

    const backupArtworkDir = `${BACKUP_TEMP_DIR}artwork-images`;
    const backupArtworkInfo = await getInfoAsync(backupArtworkDir);
    if (backupArtworkInfo.exists) {
      await moveAsync({ from: backupArtworkDir, to: ARTWORK_IMAGE_DIR });
    }

    const backupReceiptDir = `${BACKUP_TEMP_DIR}receipt-images`;
    const backupReceiptInfo = await getInfoAsync(backupReceiptDir);
    if (backupReceiptInfo.exists) {
      await moveAsync({ from: backupReceiptDir, to: RECEIPT_IMAGE_DIR });
    }

    // Verificatie: open de herstelde database en check integrity
    onProgress({ phase: 'verifying', message: 'Herstelde data verifiëren...' });
    const verifyDb = await openDatabaseAsync(DATABASE_NAME);
    const integrityResult = await verifyDb.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
    await verifyDb.closeAsync();
    if (integrityResult?.integrity_check !== 'ok') {
      throw new Error('Herstelde database is corrupt.');
    }

    // Database herladen via key-change op SQLiteProvider
    onProgress({ phase: 'cleanup', message: 'Afronden...' });
    await deleteAsync(ROLLBACK_DIR, { idempotent: true });
    await deleteAsync(BACKUP_TEMP_DIR, { idempotent: true });
  } catch (error) {
    // Rollback: originele data terugzetten
    try {
      const rollbackDbInfo = await getInfoAsync(`${ROLLBACK_DIR}${DATABASE_NAME}`);
      if (rollbackDbInfo.exists) {
        await deleteAsync(currentDbPath, { idempotent: true });
        await moveAsync({ from: `${ROLLBACK_DIR}${DATABASE_NAME}`, to: currentDbPath });
      }

      const rollbackArtworkInfo = await getInfoAsync(`${ROLLBACK_DIR}artwork-images`);
      if (rollbackArtworkInfo.exists) {
        await deleteAsync(ARTWORK_IMAGE_DIR, { idempotent: true });
        await moveAsync({ from: `${ROLLBACK_DIR}artwork-images`, to: ARTWORK_IMAGE_DIR });
      }

      const rollbackReceiptInfo = await getInfoAsync(`${ROLLBACK_DIR}receipt-images`);
      if (rollbackReceiptInfo.exists) {
        await deleteAsync(RECEIPT_IMAGE_DIR, { idempotent: true });
        await moveAsync({ from: `${ROLLBACK_DIR}receipt-images`, to: RECEIPT_IMAGE_DIR });
      }
    } catch (rollbackError) {
      console.error('Rollback mislukt:', rollbackError);
    }

    throw error;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function gatherBackupStats(db: SQLiteDatabase): Promise<BackupStats> {
  const [artworks, fairs, expenses, contacts, sales] = await Promise.all([
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM artworks'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM fairs'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM expenses'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM contacts'),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sales'),
  ]);

  const artworkImageCount = await countFilesInDirectory(ARTWORK_IMAGE_DIR);
  const receiptImageCount = await countFilesInDirectory(RECEIPT_IMAGE_DIR);

  return {
    artworks: artworks?.count ?? 0,
    fairs: fairs?.count ?? 0,
    expenses: expenses?.count ?? 0,
    contacts: contacts?.count ?? 0,
    sales: sales?.count ?? 0,
    artworkImageCount,
    receiptImageCount,
  };
}

async function countFilesInDirectory(dirPath: string): Promise<number> {
  const dirInfo = await getInfoAsync(dirPath);
  if (!dirInfo.exists) return 0;

  const files = await readDirectoryAsync(dirPath);
  return files.length;
}

async function addDirectoryToZip(
  zip: JSZip,
  zipFolderName: string,
  localDir: string,
): Promise<void> {
  const dirInfo = await getInfoAsync(localDir);
  if (!dirInfo.exists) return;

  const files = await readDirectoryAsync(localDir);
  if (files.length === 0) return;

  const folder = zip.folder(zipFolderName)!;

  for (const fileName of files) {
    const fileBase64 = await readAsStringAsync(`${localDir}${fileName}`, {
      encoding: EncodingType.Base64,
    });
    folder.file(fileName, fileBase64, { base64: true });
  }
}

async function extractZipToDirectory(zip: JSZip, targetDir: string): Promise<void> {
  const entries = Object.entries(zip.files);

  for (const [relativePath, zipEntry] of entries) {
    if (zipEntry.dir) {
      await makeDirectoryAsync(`${targetDir}${relativePath}`, { intermediates: true });
      continue;
    }

    // Subdirectory aanmaken indien nodig
    const slashIndex = relativePath.lastIndexOf('/');
    if (slashIndex !== -1) {
      const parentDir = `${targetDir}${relativePath.substring(0, slashIndex + 1)}`;
      await makeDirectoryAsync(parentDir, { intermediates: true });
    }

    const content = await zipEntry.async('base64');
    await writeAsStringAsync(`${targetDir}${relativePath}`, content, {
      encoding: EncodingType.Base64,
    });
  }
}

async function validateBackup(tempDir: string): Promise<BackupValidationResult> {
  // 1. Manifest controleren
  const manifestPath = `${tempDir}manifest.json`;
  const manifestInfo = await getInfoAsync(manifestPath);
  if (!manifestInfo.exists) {
    return { valid: false, error: 'Geen manifest.json gevonden in backup.' };
  }

  let manifest: BackupManifest;
  try {
    const manifestJson = await readAsStringAsync(manifestPath);
    manifest = JSON.parse(manifestJson);
  } catch {
    return { valid: false, error: 'manifest.json is ongeldig.' };
  }

  if (manifest.version !== 1) {
    return { valid: false, error: `Backup versie ${manifest.version} wordt niet ondersteund.` };
  }

  // 2. Database aanwezig
  const dbPath = `${tempDir}${DATABASE_NAME}`;
  const dbInfo = await getInfoAsync(dbPath);
  if (!dbInfo.exists) {
    return { valid: false, error: 'Database bestand ontbreekt in backup.' };
  }

  // 3. Database integrity check
  const integrityError = await verifyDatabaseIntegrity(dbPath);
  if (integrityError) {
    return { valid: false, error: integrityError };
  }

  // 4. Image counts valideren
  if (manifest.stats.artworkImageCount > 0) {
    const artworkImagesDir = `${tempDir}artwork-images/`;
    const artworkDirInfo = await getInfoAsync(artworkImagesDir);
    if (!artworkDirInfo.exists) {
      return { valid: false, error: 'Artwork-afbeeldingen ontbreken in backup.' };
    }
    const artworkFiles = await readDirectoryAsync(artworkImagesDir);
    if (artworkFiles.length !== manifest.stats.artworkImageCount) {
      return {
        valid: false,
        error: `Verwacht ${manifest.stats.artworkImageCount} artwork-afbeeldingen, maar ${artworkFiles.length} gevonden.`,
      };
    }
  }

  if (manifest.stats.receiptImageCount > 0) {
    const receiptImagesDir = `${tempDir}receipt-images/`;
    const receiptDirInfo = await getInfoAsync(receiptImagesDir);
    if (!receiptDirInfo.exists) {
      return { valid: false, error: 'Bonnetje-afbeeldingen ontbreken in backup.' };
    }
    const receiptFiles = await readDirectoryAsync(receiptImagesDir);
    if (receiptFiles.length !== manifest.stats.receiptImageCount) {
      return {
        valid: false,
        error: `Verwacht ${manifest.stats.receiptImageCount} bonnetje-afbeeldingen, maar ${receiptFiles.length} gevonden.`,
      };
    }
  }

  return { valid: true, manifest };
}

async function verifyDatabaseIntegrity(backupDbPath: string): Promise<string | null> {
  const tempDbName = `backup-verify-${Date.now()}.db`;

  try {
    // Kopieer backup-DB naar de standaard database-directory met een tijdelijke naam
    const tempDb = await openDatabaseAsync(tempDbName);
    const tempDbPath = tempDb.databasePath;
    await tempDb.closeAsync();

    // Overschrijf de lege temp-DB met de backup-DB
    await copyAsync({ from: backupDbPath, to: tempDbPath });

    // Open opnieuw en controleer integriteit
    const verifyDb = await openDatabaseAsync(tempDbName);
    const result = await verifyDb.getFirstAsync<{ integrity_check: string }>(
      'PRAGMA integrity_check',
    );
    await verifyDb.closeAsync();
    await deleteDatabaseAsync(tempDbName);

    if (result?.integrity_check !== 'ok') {
      return 'Database integriteitscontrole mislukt: corrupt bestand.';
    }

    return null;
  } catch (e) {
    try {
      await deleteDatabaseAsync(tempDbName);
    } catch {
      // Cleanup mislukt, niet kritiek
    }
    return `Database verificatie mislukt: ${e instanceof Error ? e.message : 'onbekende fout'}`;
  }
}
