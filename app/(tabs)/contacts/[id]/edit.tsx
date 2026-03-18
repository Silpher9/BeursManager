import { useLocalSearchParams } from 'expo-router';

import { ContactEditorScreen } from '@/src/domains/contacts/ContactEditorScreen';

export default function EditContactRoute() {
  const params = useLocalSearchParams<{ id: string }>();

  return <ContactEditorScreen contactId={params.id} />;
}
