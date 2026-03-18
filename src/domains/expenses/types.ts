export const expenseCategories = [
  'standhuur',
  'reiskosten',
  'verblijf',
  'materiaal_stand',
  'eten_drinken',
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  standhuur: 'Standhuur',
  reiskosten: 'Reiskosten',
  verblijf: 'Verblijf',
  materiaal_stand: 'Standmateriaal',
  eten_drinken: 'Eten en drinken',
};

export type ExpenseListItem = {
  id: string;
  fairId: string;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  receiptPhotoPath: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseEditorValues = {
  category: ExpenseCategory;
  amount: string;
  description: string;
  receiptPhotoPath: string | null;
};

export const emptyExpenseEditorValues: ExpenseEditorValues = {
  category: 'standhuur',
  amount: '',
  description: '',
  receiptPhotoPath: null,
};

export function validateExpenseEditorValues(values: ExpenseEditorValues) {
  const amount = Number(values.amount.trim().replace(',', '.'));

  if (!values.amount.trim()) {
    return 'Bedrag is verplicht.';
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Bedrag moet groter zijn dan 0.';
  }

  return null;
}
