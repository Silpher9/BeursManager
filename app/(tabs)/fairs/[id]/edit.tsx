import { useLocalSearchParams } from 'expo-router';

import { FairEditorScreen } from '@/src/domains/fairs/FairEditorScreen';

export default function EditFairRoute() {
  const params = useLocalSearchParams<{ id: string }>();

  return <FairEditorScreen fairId={params.id} />;
}
