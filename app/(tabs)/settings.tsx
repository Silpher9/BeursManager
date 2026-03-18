import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  getConfiguredFalKey,
  getDemoSeedSummary,
  resetDemoData,
  seedDemoData,
} from '@/src/domains/demo-data/seed';
import { AppButton } from '@/src/shared/components/AppButton';
import { Card } from '@/src/shared/components/Card';
import { Field } from '@/src/shared/components/Field';
import { Screen } from '@/src/shared/components/Screen';
import { palette } from '@/src/shared/theme/colors';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [falKey, setFalKey] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<'seed' | 'reset' | null>(null);
  const configuredFalKey = getConfiguredFalKey();
  const seedSummary = getDemoSeedSummary();
  const effectiveFalKey = falKey.trim() || configuredFalKey;
  const usesConfiguredFalKey = falKey.trim().length === 0 && configuredFalKey.length > 0;

  const handleSeed = async () => {
    setBusy('seed');
    setStatus('Demo-data voorbereiden...');

    try {
      const result = await seedDemoData(db, {
        falKey: effectiveFalKey,
        onProgress: (message) => setStatus(message),
      });

      setStatus(
        `${result.artworkCount} kunstwerken van ${result.artistCount} kunstenaars, ${result.fairCount} beurzen en ${result.contactCount} contacten geladen${result.usedFalImages ? ' met fal.ai-beelden' : ' met voorbeeldafbeeldingen'}.`
      );
    } catch (error) {
      console.error('Demo seed failed', error);
      setStatus(
        error instanceof Error ? `Demo-data mislukt: ${error.message}` : 'Demo-data mislukt.'
      );
    } finally {
      setBusy(null);
    }
  };

  const handleReset = async () => {
    setBusy('reset');
    setStatus('Alle data wissen...');

    try {
      await resetDemoData(db);
      setStatus('Alle demo-data is verwijderd.');
    } catch (error) {
      console.error('Demo reset failed', error);
      setStatus(
        error instanceof Error ? `Verwijderen mislukt: ${error.message}` : 'Verwijderen mislukt.'
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll>
      <Card>
        <Text style={styles.title}>Instellingen</Text>
        <Text style={styles.body}>
          Beheer je demo-data en voorkeuren.
        </Text>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Demo-data</Text>
        <Text style={styles.body}>
          Vul de app met voorbeelddata: {seedSummary.artistCount} kunstenaars, {seedSummary.artworkCount}{' '}
          kunstwerken, {seedSummary.fairCount} beurzen, verkopen, contacten en kosten. Optioneel
          kun je een fal.ai-key invullen om afbeeldingen te laten genereren.
        </Text>
        <Field
          label="fal.ai API key (optioneel)"
          placeholder="fal_..."
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          value={falKey}
          onChangeText={setFalKey}
        />
        {usesConfiguredFalKey ? (
          <Text style={styles.seedHint}>API key gedetecteerd en klaar voor gebruik.</Text>
        ) : null}
        <View style={styles.buttonRow}>
          <AppButton
            label={
              busy === 'seed'
                ? 'Bezig...'
                : effectiveFalKey
                  ? 'Laden met fal.ai'
                  : 'Voorbeelddata laden'
            }
            onPress={handleSeed}
            disabled={busy !== null}
          />
          <AppButton
            label={busy === 'reset' ? 'Bezig...' : 'Alles wissen'}
            onPress={handleReset}
            disabled={busy !== null}
            variant="secondary"
          />
        </View>
        <Text style={styles.seedHint}>
          Zonder key worden standaard voorbeeldafbeeldingen gebruikt. Met een fal.ai-key worden
          afbeeldingen gegenereerd (dit duurt langer en verbruikt credits).
        </Text>
        {status ? <Text style={styles.statusText}>{status}</Text> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.text,
  },
  body: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
    color: palette.mutedText,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  buttonRow: {
    gap: 10,
  },
  seedHint: {
    fontSize: 13,
    lineHeight: 20,
    color: palette.mutedText,
  },
  statusText: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.text,
  },
});
