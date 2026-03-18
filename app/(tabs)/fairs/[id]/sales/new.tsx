import { useLocalSearchParams } from 'expo-router';

import { SaleEditorScreen } from '@/src/domains/sales/SaleEditorScreen';

export default function NewSaleRoute() {
  const params = useLocalSearchParams<{ id: string }>();

  return <SaleEditorScreen fairId={params.id} />;
}
