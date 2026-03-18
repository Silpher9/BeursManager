import { useLocalSearchParams } from 'expo-router';

import { SaleDetailScreen } from '@/src/domains/sales/SaleDetailScreen';

export default function SaleDetailRoute() {
  const params = useLocalSearchParams<{ id: string; saleId: string }>();

  return <SaleDetailScreen fairId={params.id} saleId={params.saleId} />;
}
