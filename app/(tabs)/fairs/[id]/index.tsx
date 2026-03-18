import { useLocalSearchParams } from 'expo-router';

import { FairDetailScreen } from '@/src/domains/fairs/FairDetailScreen';

export default function FairDetailRoute() {
  const params = useLocalSearchParams<{ id: string }>();

  return <FairDetailScreen fairId={params.id} />;
}
