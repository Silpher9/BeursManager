import { randomUUID } from 'expo-crypto';
import { type SQLiteDatabase } from 'expo-sqlite';

import {
  type ExpenseCategory,
  type ExpenseEditorValues,
  type ExpenseListItem,
  expenseCategories,
} from '@/src/domains/expenses/types';

type ExpenseRow = {
  id: string;
  fair_id: string;
  category: string;
  amount: number;
  description: string | null;
  receipt_photo_path: string | null;
  created_at: string;
  updated_at: string;
};

export async function listExpensesForFair(db: SQLiteDatabase, fairId: string) {
  const rows = await db.getAllAsync<ExpenseRow>(
    `SELECT
        id,
        fair_id,
        category,
        amount,
        description,
        receipt_photo_path,
        created_at,
        updated_at
     FROM expenses
     WHERE fair_id = ?
     ORDER BY datetime(created_at) DESC`,
    [fairId]
  );

  return rows.map(mapExpenseRow) satisfies ExpenseListItem[];
}

export async function createExpenseForFair(
  db: SQLiteDatabase,
  fairId: string,
  values: ExpenseEditorValues
) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const parsed = normalizeExpenseValues(values);

  await db.runAsync(
    `INSERT INTO expenses (
      id,
      fair_id,
      category,
      amount,
      description,
      receipt_photo_path,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, fairId, parsed.category, parsed.amount, parsed.description, values.receiptPhotoPath, now, now]
  );

  return id;
}

function mapExpenseRow(row: ExpenseRow): ExpenseListItem {
  return {
    id: row.id,
    fairId: row.fair_id,
    category: asExpenseCategory(row.category),
    amount: row.amount,
    description: row.description,
    receiptPhotoPath: row.receipt_photo_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function asExpenseCategory(value: string): ExpenseCategory {
  return expenseCategories.includes(value as ExpenseCategory)
    ? (value as ExpenseCategory)
    : 'standhuur';
}

function normalizeExpenseValues(values: ExpenseEditorValues) {
  return {
    category: values.category,
    amount: Number(values.amount.trim().replace(',', '.')),
    description: normalizeOptionalText(values.description),
  };
}

function normalizeOptionalText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
