import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/src/shared/theme/stackScreenOptions';

export default function ContactsLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Contacten', headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Nieuw contact', headerShown: false }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Contact', headerShown: false }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Contact bewerken', headerShown: false }} />
    </Stack>
  );
}
