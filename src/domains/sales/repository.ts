import { randomUUID } from 'expo-crypto';
import { type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { saveContact } from '@/src/domains/contacts/repository';
import {
  computeSalePrice,
  parseOptionalNumber,
  type SaleCandidate,
  type SaleDetail,
  type SaleEditorValues,
  type SaleListItem,
} from '@/src/domains/sales/types';

type SaleCandidateRow = {
  artwork_id: string;
  title: string;
  photo_path: string | null;
  thumbnail_path: string | null;
  asking_price: number | null;
  status: string | null;
  series: string | null;
};

type SaleRow = {
  id: string;
  fair_id: string;
  fair_name: string | null;
  artwork_id: string;
  artwork_title: string;
  artwork_photo_path: string | null;
  artwork_thumbnail_path: string | null;
  asking_price: number | null;
  discount: number;
  sale_price: number;
  payment_status: SaleListItem['paymentStatus'];
  payment_method: SaleListItem['paymentMethod'];
  contact_id: string | null;
  contact_name: string | null;
  sold_at: string;
};

export async function listSalesForFair(db: SQLiteDatabase, fairId: string) {
  const rows = await db.getAllAsync<SaleRow>(
    `SELECT
        sales.id,
        sales.fair_id,
        fairs.name AS fair_name,
        sales.artwork_id,
        artworks.title AS artwork_title,
        artworks.photo_path AS artwork_photo_path,
        artworks.thumbnail_path AS artwork_thumbnail_path,
        sales.asking_price,
        sales.discount,
        sales.sale_price,
        sales.payment_status,
        sales.payment_method,
        sales.contact_id,
        contacts.name AS contact_name,
        sales.sold_at
     FROM sales
     INNER JOIN artworks ON artworks.id = sales.artwork_id
     INNER JOIN fairs ON fairs.id = sales.fair_id
     LEFT JOIN contacts ON contacts.id = sales.contact_id
     WHERE sales.fair_id = ?
     ORDER BY datetime(sales.sold_at) DESC`,
    fairId
  );

  return rows.map((row) => ({
    id: row.id,
    artworkId: row.artwork_id,
    artworkTitle: row.artwork_title,
    artworkPhotoPath: row.artwork_photo_path,
    artworkThumbnailPath: row.artwork_thumbnail_path,
    askingPrice: row.asking_price,
    discount: row.discount,
    salePrice: row.sale_price,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    contactId: row.contact_id,
    contactName: row.contact_name,
    soldAt: row.sold_at,
  })) satisfies SaleListItem[];
}

export async function getSaleById(db: SQLiteDatabase, saleId: string) {
  const row = await db.getFirstAsync<SaleRow>(
    `SELECT
        sales.id,
        sales.fair_id,
        fairs.name AS fair_name,
        sales.artwork_id,
        artworks.title AS artwork_title,
        artworks.photo_path AS artwork_photo_path,
        artworks.thumbnail_path AS artwork_thumbnail_path,
        sales.asking_price,
        sales.discount,
        sales.sale_price,
        sales.payment_status,
        sales.payment_method,
        sales.contact_id,
        contacts.name AS contact_name,
        sales.sold_at
     FROM sales
     INNER JOIN artworks ON artworks.id = sales.artwork_id
     INNER JOIN fairs ON fairs.id = sales.fair_id
     LEFT JOIN contacts ON contacts.id = sales.contact_id
     WHERE sales.id = ?`,
    [saleId]
  );

  return row ? mapSaleRow(row) : null;
}

export async function listSaleCandidatesForFair(db: SQLiteDatabase, fairId: string) {
  const rows = await db.getAllAsync<SaleCandidateRow>(
    `SELECT
        artworks.id AS artwork_id,
        artworks.title,
        artworks.photo_path,
        artworks.thumbnail_path,
        artworks.asking_price,
        artworks.status,
        artworks.series
     FROM fair_artworks
     INNER JOIN artworks ON artworks.id = fair_artworks.artwork_id
     WHERE fair_artworks.fair_id = ?
       AND fair_artworks.included = 1
       AND fair_artworks.sold = 0
       AND artworks.status != 'verkocht'
     ORDER BY artworks.title COLLATE NOCASE ASC`,
    fairId
  );

  return rows.map((row) => ({
    artworkId: row.artwork_id,
    title: row.title,
    photoPath: row.photo_path,
    thumbnailPath: row.thumbnail_path,
    askingPrice: row.asking_price,
    status: row.status,
    series: row.series,
  })) satisfies SaleCandidate[];
}

export async function createSaleForFair(
  db: SQLiteDatabase,
  fairId: string,
  values: SaleEditorValues
) {
  const saleId = randomUUID();
  const now = new Date().toISOString();
  const askingPrice = parseOptionalNumber(values.askingPrice) ?? 0;
  const discount = parseOptionalNumber(values.discount) ?? 0;
  const salePrice = computeSalePrice(values);
  const hasInlineContact = Boolean(values.contactName.trim());

  const runWriteTransaction = async (task: (database: SQLiteDatabase) => Promise<void>) => {
    if (Platform.OS === 'web') {
      await db.withTransactionAsync(async () => {
        await task(db);
      });
      return;
    }

    await db.withExclusiveTransactionAsync(async (txn) => {
      await task(txn);
    });
  };

  await runWriteTransaction(async (database) => {
    const contactId = hasInlineContact
      ? await saveContact(database, {
          name: values.contactName,
          email: values.contactEmail,
          phone: values.contactPhone,
          type: values.contactType,
          fairId,
          notes: '',
        })
      : values.contactId || null;

    await database.runAsync(
      `INSERT INTO sales (
        id,
        fair_id,
        artwork_id,
        asking_price,
        discount,
        sale_price,
        payment_status,
        payment_method,
        sold_at,
        contact_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleId,
        fairId,
        values.artworkId,
        askingPrice,
        discount,
        salePrice,
        values.paymentStatus,
        values.paymentMethod,
        now,
        contactId,
        now,
        now,
      ]
    );

    await database.runAsync(
      `INSERT INTO fair_artworks (fair_id, artwork_id, included, sold, sale_price)
       VALUES (?, ?, 1, 1, ?)
       ON CONFLICT(fair_id, artwork_id)
       DO UPDATE SET included = 1, sold = 1, sale_price = excluded.sale_price`,
      [fairId, values.artworkId, salePrice]
    );

    await database.runAsync(
      `UPDATE artworks
       SET status = 'verkocht',
           updated_at = ?
       WHERE id = ?`,
      [now, values.artworkId]
    );

    if (contactId) {
      await upsertContactArtworkLink(database, contactId, values.artworkId, fairId);
    }
  });

  return saleId;
}

export async function updateSale(db: SQLiteDatabase, saleId: string, values: SaleEditorValues) {
  const existingSale = await getSaleById(db, saleId);

  if (!existingSale) {
    throw new Error('Deze verkoop bestaat niet meer.');
  }

  const askingPrice = parseOptionalNumber(values.askingPrice) ?? 0;
  const discount = parseOptionalNumber(values.discount) ?? 0;
  const salePrice = computeSalePrice(values);
  const now = new Date().toISOString();
  const hasInlineContact = Boolean(values.contactName.trim());

  const runWriteTransaction = async (task: (database: SQLiteDatabase) => Promise<void>) => {
    if (Platform.OS === 'web') {
      await db.withTransactionAsync(async () => {
        await task(db);
      });
      return;
    }

    await db.withExclusiveTransactionAsync(async (txn) => {
      await task(txn);
    });
  };

  await runWriteTransaction(async (database) => {
    const nextContactId = hasInlineContact
      ? await saveContact(database, {
          name: values.contactName,
          email: values.contactEmail,
          phone: values.contactPhone,
          type: values.contactType,
          fairId: existingSale.fairId,
          notes: '',
        })
      : values.contactId || null;

    await database.runAsync(
      `UPDATE sales
       SET asking_price = ?,
           discount = ?,
           sale_price = ?,
           payment_status = ?,
           payment_method = ?,
           contact_id = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        askingPrice,
        discount,
        salePrice,
        values.paymentStatus,
        values.paymentMethod,
        nextContactId,
        now,
        saleId,
      ]
    );

    await database.runAsync(
      `UPDATE fair_artworks
       SET sale_price = ?, sold = 1, included = 1
       WHERE fair_id = ? AND artwork_id = ?`,
      [salePrice, existingSale.fairId, existingSale.artworkId]
    );

    if (existingSale.contactId && existingSale.contactId !== nextContactId) {
      await database.runAsync(
        `DELETE FROM contact_artworks
         WHERE contact_id = ?
           AND artwork_id = ?
           AND fair_id = ?`,
        [existingSale.contactId, existingSale.artworkId, existingSale.fairId]
      );
    }

    if (nextContactId) {
      await upsertContactArtworkLink(
        database,
        nextContactId,
        existingSale.artworkId,
        existingSale.fairId
      );
    }
  });
}

function mapSaleRow(row: SaleRow): SaleDetail {
  return {
    id: row.id,
    fairId: row.fair_id,
    fairName: row.fair_name,
    artworkId: row.artwork_id,
    artworkTitle: row.artwork_title,
    artworkPhotoPath: row.artwork_photo_path,
    artworkThumbnailPath: row.artwork_thumbnail_path,
    askingPrice: row.asking_price,
    discount: row.discount,
    salePrice: row.sale_price,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    contactId: row.contact_id,
    contactName: row.contact_name,
    soldAt: row.sold_at,
  };
}

async function upsertContactArtworkLink(
  db: SQLiteDatabase,
  contactId: string,
  artworkId: string,
  fairId: string
) {
  await db.runAsync(
    `INSERT INTO contact_artworks (contact_id, artwork_id, fair_id, notes)
     VALUES (?, ?, ?, NULL)
     ON CONFLICT(contact_id, artwork_id)
     DO UPDATE SET fair_id = excluded.fair_id, notes = excluded.notes`,
    [contactId, artworkId, fairId]
  );
}
