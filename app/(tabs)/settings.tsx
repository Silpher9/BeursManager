import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import {
  exportBackup,
  performRestore,
  pickAndValidateBackup,
} from '@/src/domains/backup/backupService';
import { triggerDatabaseReload, setMaintenanceMode } from '@/src/db/dbReload';
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
  const [backupBusy, setBackupBusy] = useState<'export' | 'import' | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const configuredFalKey = getConfiguredFalKey();
  const seedSummary = getDemoSeedSummary();
  const effectiveFalKey = falKey.trim() || configuredFalKey;
  const usesConfiguredFalKey = falKey.trim().length === 0 && configuredFalKey.length > 0;

  const anyBusy = busy !== null || backupBusy !== null;

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

  const handleExport = async () => {
    setBackupBusy('export');
    setBackupStatus(null);

    try {
      await exportBackup(db, (progress) => {
        setBackupStatus(progress.message);
      });
      setBackupStatus('Backup succesvol aangemaakt.');
    } catch (error) {
      console.error('Export failed:', error);
      setBackupStatus(
        error instanceof Error
          ? `Export mislukt: ${error.message}`
          : 'Export mislukt.',
      );
    } finally {
      setBackupBusy(null);
    }
  };

  const handleImport = async () => {
    setBackupBusy('import');
    setBackupStatus(null);

    try {
      const manifest = await pickAndValidateBackup((progress) => {
        setBackupStatus(progress.message);
      });

      if (!manifest) {
        setBackupBusy(null);
        setBackupStatus(null);
        return;
      }

      const { stats } = manifest;
      Alert.alert(
        'Backup importeren',
        `Dit overschrijft alle huidige data.\n\n` +
          `De backup bevat:\n` +
          `• ${stats.artworks} kunstwerken\n` +
          `• ${stats.fairs} beurzen\n` +
          `• ${stats.expenses} kosten\n` +
          `• ${stats.contacts} contacten\n` +
          `• ${stats.sales} verkopen\n\n` +
          `Wil je doorgaan?`,
        [
          {
            text: 'Annuleer',
            style: 'cancel',
            onPress: () => {
              setBackupBusy(null);
              setBackupStatus(null);
            },
          },
          {
            text: 'Importeer',
            style: 'destructive',
            onPress: async () => {
              const dbPath = db.databasePath;
              try {
                await setMaintenanceMode(true);
                await performRestore(dbPath, (progress) => {
                  // status updating won't be visible while unmounted, but we keep it for consistency
                  console.log('Restore progress:', progress.message);
                });

                triggerDatabaseReload();
                await setMaintenanceMode(false);
                Alert.alert('Backup hersteld', 'De backup is succesvol hersteld.');
              } catch (restoreError) {
                console.error('Restore failed:', restoreError);
                await setMaintenanceMode(false);
                Alert.alert(
                  'Herstel mislukt',
                  restoreError instanceof Error
                    ? `Import mislukt: ${restoreError.message}`
                    : 'Import mislukt.'
                );
              } finally {
                setBackupBusy(null);
                setBackupStatus(null);
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error('Import validation failed:', error);
      setBackupBusy(null);
      setBackupStatus(
        error instanceof Error
          ? `Import mislukt: ${error.message}`
          : 'Import mislukt.',
      );
    }
  };

  return (
    <Screen scroll>
      <Card>
        <Text style={styles.title}>Instellingen</Text>
        <Text style={styles.body}>
          Beheer je data, backup en voorkeuren.
        </Text>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Data beheer</Text>
        <Text style={styles.body}>
          Exporteer al je data als backup of importeer een eerdere backup.
          De backup bevat je database, kunstwerkfoto's en bonnetje-afbeeldingen.
        </Text>
        <View style={styles.buttonRow}>
          <AppButton
            label={backupBusy === 'export' ? 'Bezig...' : 'Exporteer alles'}
            onPress={handleExport}
            disabled={anyBusy}
          />
          <AppButton
            label={backupBusy === 'import' ? 'Bezig...' : 'Importeer backup'}
            onPress={handleImport}
            disabled={anyBusy}
            variant="secondary"
          />
        </View>
        {backupBusy && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={palette.accent} />
            <Text style={styles.loadingText}>{backupStatus || 'Bezig...'}</Text>
          </View>
        )}
        {!backupBusy && backupStatus ? <Text style={styles.statusText}>{backupStatus}</Text> : null}
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
            disabled={anyBusy}
          />
          <AppButton
            label={busy === 'reset' ? 'Bezig...' : 'Alles wissen'}
            onPress={handleReset}
            disabled={anyBusy}
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: palette.accent,
    fontWeight: '500',
  },
});
