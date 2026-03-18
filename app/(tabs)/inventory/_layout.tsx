import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/src/shared/theme/stackScreenOptions';

export default function InventoryLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Voorraad', headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Nieuw kunstwerk', headerShown: false }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Kunstwerk', headerShown: false }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Kunstwerk bewerken', headerShown: false }} />
    </Stack>
  );
}
