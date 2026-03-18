import { useLocalSearchParams } from 'expo-router';

import { ArtworkEditorScreen } from '@/src/domains/inventory/ArtworkEditorScreen';

export default function EditArtworkRoute() {
  const params = useLocalSearchParams<{ id: string }>();

  return <ArtworkEditorScreen artworkId={params.id} />;
}
