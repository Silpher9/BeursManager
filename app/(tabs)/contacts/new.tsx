import { useLocalSearchParams } from 'expo-router';

import { ContactEditorScreen } from '@/src/domains/contacts/ContactEditorScreen';

export default function NewContactRoute() {
  const params = useLocalSearchParams<{ fairId?: string }>();

  return <ContactEditorScreen returnToFairId={params.fairId} />;
}
