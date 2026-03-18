import { useLocalSearchParams } from 'expo-router';

import { ExpenseEditorScreen } from '@/src/domains/expenses/ExpenseEditorScreen';

export default function NewExpenseRoute() {
  const params = useLocalSearchParams<{ id: string }>();

  return <ExpenseEditorScreen fairId={params.id} />;
}
