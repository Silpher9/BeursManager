import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/src/shared/theme/stackScreenOptions';

export default function FairsLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Beurzen', headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Nieuwe beurs', headerShown: false }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Beurs', headerShown: false }} />
      <Stack.Screen name="[id]/day" options={{ title: 'Beursdag-modus', headerShown: false }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Beurs bewerken', headerShown: false }} />
      <Stack.Screen
        name="[id]/expenses/new"
        options={{ title: 'Nieuwe kostenpost', headerShown: false }}
      />
      <Stack.Screen
        name="[id]/sales/new"
        options={{ title: 'Verkoop registreren', headerShown: false }}
      />
      <Stack.Screen name="[id]/sales/[saleId]" options={{ title: 'Verkoop', headerShown: false }} />
    </Stack>
  );
}
