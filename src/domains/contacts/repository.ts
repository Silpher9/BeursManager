import { randomUUID } from 'expo-crypto';
import { type SQLiteDatabase } from 'expo-sqlite';

import {
  type Contact,
  type ContactEditorValues,
  type ContactInterest,
  type ContactType,
  type FairFilterOption,
  type InterestPickerArtwork,
  contactTypes,
} from '@/src/domains/contacts/types';

type ContactRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  fair_id: string | null;
  fair_name: string | null;
  purchased_artworks: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function listContacts(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<ContactRow>(
    `SELECT
        contacts.*,
        fairs.name AS fair_name,
        GROUP_CONCAT(DISTINCT artworks.title) AS purchased_artworks
     FROM contacts
     LEFT JOIN fairs ON fairs.id = contacts.fair_id
     LEFT JOIN sales ON sales.contact_id = contacts.id
     LEFT JOIN artworks ON artworks.id = sales.artwork_id
     GROUP BY contacts.id
     ORDER BY datetime(contacts.created_at) DESC`
  );

  return rows.map(mapContactRow);
}

export async function getContactById(db: SQLiteDatabase, contactId: string) {
  const row = await db.getFirstAsync<ContactRow>(
    `SELECT
        contacts.*,
        fairs.name AS fair_name,
        GROUP_CONCAT(DISTINCT artworks.title) AS purchased_artworks
     FROM contacts
     LEFT JOIN fairs ON fairs.id = contacts.fair_id
     LEFT JOIN sales ON sales.contact_id = contacts.id
     LEFT JOIN artworks ON artworks.id = sales.artwork_id
     WHERE contacts.id = ?
     GROUP BY contacts.id`,
    [contactId]
  );

  return row ? mapContactRow(row) : null;
}

export async function saveContact(db: SQLiteDatabase, values: ContactEditorValues) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const parsed = normalizeContactValues(values);

  await db.runAsync(
    `INSERT INTO contacts (
      id,
      name,
      email,
      phone,
      type,
      fair_id,
      notes,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, parsed.name, parsed.email, parsed.phone, parsed.type, parsed.fairId, parsed.notes, now, now]
  );

  return id;
}

export async function updateContact(
  db: SQLiteDatabase,
  contactId: string,
  values: ContactEditorValues
) {
  const now = new Date().toISOString();
  const parsed = normalizeContactValues(values);

  await db.runAsync(
    `UPDATE contacts SET
      name = ?,
      email = ?,
      phone = ?,
      type = ?,
      fair_id = ?,
      notes = ?,
      updated_at = ?
     WHERE id = ?`,
    [parsed.name, parsed.email, parsed.phone, parsed.type, parsed.fairId, parsed.notes, now, contactId]
  );
}

export async function deleteContact(db: SQLiteDatabase, contactId: string) {
  await db.runAsync('DELETE FROM contacts WHERE id = ?', [contactId]);
}

type FairFilterRow = {
  id: string;
  name: string;
  start_date: string | null;
};

export async function listContactFairOptions(db: SQLiteDatabase): Promise<FairFilterOption[]> {
  const rows = await db.getAllAsync<FairFilterRow>(
    `SELECT DISTINCT fairs.id, fairs.name, fairs.start_date
     FROM contacts
     INNER JOIN fairs ON fairs.id = contacts.fair_id
     ORDER BY fairs.start_date DESC`
  );

  return rows.map((row) => ({
    id: row.id,
    label: row.start_date
      ? `${row.name} (${row.start_date.slice(0, 4)})`
      : row.name,
  }));
}

type ContactInterestRow = {
  artwork_id: string;
  artwork_title: string;
  artwork_photo_path: string | null;
  artwork_thumbnail_path: string | null;
  fair_id: string | null;
  fair_name: string | null;
  notes: string | null;
};

export async function getContactInterests(db: SQLiteDatabase, contactId: string) {
  const rows = await db.getAllAsync<ContactInterestRow>(
    `SELECT
        contact_artworks.artwork_id,
        artworks.title AS artwork_title,
        artworks.photo_path AS artwork_photo_path,
        artworks.thumbnail_path AS artwork_thumbnail_path,
        contact_artworks.fair_id,
        fairs.name AS fair_name,
        contact_artworks.notes
     FROM contact_artworks
     INNER JOIN artworks ON artworks.id = contact_artworks.artwork_id
     LEFT JOIN fairs ON fairs.id = contact_artworks.fair_id
     WHERE contact_artworks.contact_id = ?
     ORDER BY artworks.title COLLATE NOCASE ASC`,
    [contactId]
  );

  return rows.map(
    (row): ContactInterest => ({
      artworkId: row.artwork_id,
      artworkTitle: row.artwork_title,
      artworkPhotoPath: row.artwork_photo_path,
      artworkThumbnailPath: row.artwork_thumbnail_path,
      fairId: row.fair_id,
      fairName: row.fair_name,
      notes: row.notes,
    })
  );
}

export async function addContactInterest(
  db: SQLiteDatabase,
  contactId: string,
  artworkId: string,
  notes?: string | null
) {
  await db.runAsync(
    `INSERT INTO contact_artworks (contact_id, artwork_id, fair_id, notes)
     VALUES (?, ?, NULL, ?)
     ON CONFLICT(contact_id, artwork_id)
     DO UPDATE SET notes = excluded.notes`,
    [contactId, artworkId, notes ?? null]
  );
}

export async function removeContactInterest(
  db: SQLiteDatabase,
  contactId: string,
  artworkId: string
) {
  await db.runAsync(
    'DELETE FROM contact_artworks WHERE contact_id = ? AND artwork_id = ?',
    [contactId, artworkId]
  );
}

type InterestPickerArtworkRow = {
  id: string;
  title: string;
  thumbnail_path: string | null;
  photo_path: string | null;
  artist_name: string | null;
  status: string;
};

export async function listArtworksForInterestPicker(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<InterestPickerArtworkRow>(
    `SELECT
        artworks.id,
        artworks.title,
        artworks.thumbnail_path,
        artworks.photo_path,
        artists.name AS artist_name,
        artworks.status
     FROM artworks
     LEFT JOIN artists ON artists.id = artworks.artist_id
     ORDER BY artworks.title COLLATE NOCASE ASC`
  );

  return rows.map(
    (row): InterestPickerArtwork => ({
      id: row.id,
      title: row.title,
      thumbnailPath: row.thumbnail_path,
      photoPath: row.photo_path,
      artistName: row.artist_name,
      status: row.status,
    })
  );
}

function mapContactRow(row: ContactRow): Contact {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    type: asContactType(row.type),
    fairId: row.fair_id,
    fairName: row.fair_name,
    purchasedArtworkTitles: parseCommaSeparatedList(row.purchased_artworks),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function asContactType(value: string): ContactType {
  return contactTypes.includes(value as ContactType) ? (value as ContactType) : 'overig';
}

function normalizeContactValues(values: ContactEditorValues) {
  return {
    name: values.name.trim(),
    email: normalizeOptionalText(values.email),
    phone: normalizeOptionalText(values.phone),
    type: values.type,
    fairId: normalizeOptionalText(values.fairId),
    notes: normalizeOptionalText(values.notes),
  };
}

function normalizeOptionalText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseCommaSeparatedList(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}
