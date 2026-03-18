import { useLocalSearchParams } from 'expo-router';

import { FairDayScreen } from '@/src/domains/fairs/FairDayScreen';

export default function FairDayRoute() {
  const params = useLocalSearchParams<{ id: string }>();

  return <FairDayScreen fairId={params.id} />;
}
