import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/src/shared/theme/stackScreenOptions';

export default function StandLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Stand', headerShown: false }} />
    </Stack>
  );
}
