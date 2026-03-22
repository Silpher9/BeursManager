import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';

import { AppButton } from '@/src/shared/components/AppButton';
import { palette } from '@/src/shared/theme/colors';

export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();

  const message = __DEV__
    ? error.message
    : 'De app ondervond een onverwachte fout';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Oeps, er ging iets mis</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.buttons}>
        <AppButton label="Opnieuw proberen" onPress={retry} />
        <AppButton
          label="Terug naar start"
          variant="secondary"
          onPress={() => router.replace('/')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: palette.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: palette.mutedText,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 400,
  },
  buttons: {
    gap: 12,
    alignItems: 'center',
  },
});
