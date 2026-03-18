import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { type ExpenseCategory, expenseCategories } from '@/src/domains/expenses/types';

export type ReceiptExtraction = {
  amount: string | null;
  description: string | null;
  category: ExpenseCategory | null;
};

const RECEIPT_SERVER_URL = process.env.EXPO_PUBLIC_RECEIPT_SERVER_URL;
const RECEIPT_TOKEN = process.env.EXPO_PUBLIC_RECEIPT_TOKEN;

export async function extractReceiptData(imageUri: string): Promise<ReceiptExtraction> {
  if (!RECEIPT_SERVER_URL || !RECEIPT_TOKEN) {
    throw new Error('Receipt-server is niet geconfigureerd.');
  }

  const formData = new FormData();
  const imageBlob = await uriToBlob(imageUri);
  formData.append('image', imageBlob, 'receipt.jpg');

  const response = await fetch(`${RECEIPT_SERVER_URL}/api/receipt/extract`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RECEIPT_TOKEN}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Server fout: ${response.status}`);
  }

  const data = await response.json();

  return {
    amount: typeof data.amount === 'string' ? data.amount : null,
    description: typeof data.description === 'string' ? data.description : null,
    category: isValidCategory(data.category) ? data.category : null,
  };
}

function isValidCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && expenseCategories.includes(value as ExpenseCategory);
}

async function uriToBlob(uri: string): Promise<Blob> {
  if (Platform.OS === 'web' || uri.startsWith('data:')) {
    const response = await fetch(uri);
    return response.blob();
  }

  // React Native: lees lokale file:// URI via expo-file-system
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([byteArray], { type: 'image/jpeg' });
}
