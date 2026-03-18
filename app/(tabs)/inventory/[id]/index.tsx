import { useLocalSearchParams } from 'expo-router';

import { ArtworkDetailScreen } from '@/src/domains/inventory/ArtworkDetailScreen';

export default function ArtworkDetailRoute() {
  const params = useLocalSearchParams<{ id: string }>();

  return <ArtworkDetailScreen artworkId={params.id} />;
}
