import { useLocalSearchParams } from 'expo-router';

import { ContactDetailScreen } from '@/src/domains/contacts/ContactDetailScreen';

export default function ContactDetailRoute() {
  const params = useLocalSearchParams<{ id: string }>();

  return <ContactDetailScreen contactId={params.id} />;
}
