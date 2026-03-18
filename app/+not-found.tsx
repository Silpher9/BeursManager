import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/src/shared/components/AppButton';
import { palette } from '@/src/shared/theme/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Niet gevonden' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Deze pagina bestaat niet.</Text>
        <Text style={styles.description}>
          Navigeer terug naar de voorraad om verder te werken.
        </Text>
        <Link href="/inventory" asChild>
          <AppButton label="Ga naar voorraad" />
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: palette.background,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.text,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: palette.mutedText,
  },
});
