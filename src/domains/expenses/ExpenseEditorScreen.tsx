import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native';

import { createExpenseForFair } from '@/src/domains/expenses/repository';
import {
  deleteReceiptPhotoAsync,
  persistReceiptPhotoAsync,
} from '@/src/domains/expenses/receiptStorage';
import { extractReceiptData } from '@/src/domains/expenses/receiptVision';
import { getFairById } from '@/src/domains/fairs/repository';
import {
  emptyExpenseEditorValues,
  expenseCategories,
  expenseCategoryLabels,
  type ExpenseEditorValues,
  validateExpenseEditorValues,
} from '@/src/domains/expenses/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { Card } from '@/src/shared/components/Card';
import { ChoiceChip } from '@/src/shared/components/ChoiceChip';
import { BreadcrumbHeader } from '@/src/shared/components/BreadcrumbHeader';
import { Field } from '@/src/shared/components/Field';
import { Screen } from '@/src/shared/components/Screen';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';
import { palette } from '@/src/shared/theme/colors';

type Props = {
  fairId?: string;
};

export function ExpenseEditorScreen({ fairId }: Props) {
  const db = useSQLiteContext();
  const [values, setValues] = useState<ExpenseEditorValues>(emptyExpenseEditorValues);
  const [fairName, setFairName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionMessage, setExtractionMessage] = useState<string | null>(null);

  useAsyncEffect(async (isMounted) => {
    setFairName(null);

    if (!fairId) return;

    try {
      const fair = await getFairById(db, fairId);
      if (!isMounted()) return;
      setFairName(fair?.name ?? null);
    } catch (caughtError) {
      if (!isMounted()) return;
      console.error('Fair load failed', caughtError);
      setFairName(null);
    }
  }, [db, fairId]);

  const setValue = <Key extends keyof ExpenseEditorValues>(
    key: Key,
    value: ExpenseEditorValues[Key]
  ) => {
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
  };

  const handleReceiptCaptured = async (uri: string) => {
    setValue('receiptPhotoPath', uri);
    setExtractionMessage(null);
    setExtracting(true);

    try {
      const result = await extractReceiptData(uri);

      if (result.amount) {
        setValue('amount', result.amount);
      }
      if (result.description) {
        setValue('description', result.description);
      }
      if (result.category) {
        setValue('category', result.category);
      }

      setExtractionMessage('Velden ingevuld op basis van bonnetje.');
    } catch (caughtError) {
      console.warn('Receipt extraction failed', caughtError);
      setExtractionMessage('Kon bonnetje niet automatisch lezen, vul handmatig in.');
    } finally {
      setExtracting(false);
    }
  };

  const handleTakeReceiptPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Toegang nodig', 'Geef cameratoegang om een bonnetje vast te leggen.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await handleReceiptCaptured(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Fout', 'De camera kon niet worden geopend.');
    }
  };

  const handlePickReceiptPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Toegang nodig', 'Geef foto-toegang om een bonnetje te selecteren.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await handleReceiptCaptured(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Fout', 'De fotobibliotheek kon niet worden geopend.');
    }
  };

  const handleRemoveReceipt = () => {
    setValue('receiptPhotoPath', null);
    setExtractionMessage(null);
  };

  const handleSave = async () => {
    if (!fairId) {
      setError('Ongeldige beurs.');
      return;
    }

    const validationError = validateExpenseEditorValues(values);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    let persistedPhotoPath: string | null = null;

    try {
      if (values.receiptPhotoPath) {
        persistedPhotoPath = await persistReceiptPhotoAsync(values.receiptPhotoPath);
      }

      await createExpenseForFair(db, fairId, {
        ...values,
        receiptPhotoPath: persistedPhotoPath,
      });
      router.replace(`/fairs/${fairId}`);
    } catch (caughtError) {
      if (persistedPhotoPath) {
        await deleteReceiptPhotoAsync(persistedPhotoPath);
      }

      const message =
        caughtError instanceof Error ? caughtError.message : 'Onbekende fout tijdens opslaan.';

      console.error('Expense create failed', caughtError);
      setError(`Kostenpost opslaan mislukt: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const goToFairDetail = () => {
    if (fairId) {
      router.replace({ pathname: '/fairs/[id]', params: { id: fairId } });
      return;
    }

    router.replace('/fairs');
  };

  return (
    <Screen scroll>
      <BreadcrumbHeader
        breadcrumbs={[
          { label: 'Beurzen', onPress: () => router.replace('/fairs') },
          {
            label: fairName ?? 'Beurs',
            onPress: fairId ? goToFairDetail : undefined,
          },
          { label: 'Nieuwe kostenpost' },
        ]}
        screenTitle="Nieuwe kostenpost"
        action={{ label: 'Annuleren', onPress: goToFairDetail }}
      />

      <Card>
        <Text style={styles.sectionTitle}>Bonnetje</Text>
        {values.receiptPhotoPath ? (
          <Image source={{ uri: values.receiptPhotoPath }} style={styles.receiptPreview} />
        ) : (
          <View style={styles.receiptPlaceholder}>
            <Text style={styles.placeholderText}>
              Maak een foto van het bonnetje om velden automatisch in te vullen.
            </Text>
          </View>
        )}
        {extracting ? (
          <View style={styles.extractingRow}>
            <ActivityIndicator size="small" color={palette.accent} />
            <Text style={styles.extractingText}>Bonnetje lezen...</Text>
          </View>
        ) : null}
        {extractionMessage && !extracting ? (
          <Text style={styles.extractionMessage}>{extractionMessage}</Text>
        ) : null}
        <View style={styles.buttonRow}>
          <AppButton label="Foto maken" onPress={handleTakeReceiptPhoto} variant="secondary" />
          <AppButton label="Kies foto" onPress={handlePickReceiptPhoto} variant="secondary" />
        </View>
        {values.receiptPhotoPath ? (
          <AppButton label="Foto verwijderen" onPress={handleRemoveReceipt} variant="secondary" />
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Categorie</Text>
        <View style={styles.choiceRow}>
          {expenseCategories.map((category) => (
            <ChoiceChip
              key={category}
              label={expenseCategoryLabels[category]}
              active={values.category === category}
              onPress={() => setValue('category', category)}
            />
          ))}
        </View>
        <Field
          label="Bedrag"
          placeholder="250"
          keyboardType="decimal-pad"
          value={values.amount}
          onChangeText={(value) => setValue('amount', value)}
        />
        <Field
          label="Omschrijving"
          placeholder="Bijv. standhuur, parkeren, lunch..."
          value={values.description}
          onChangeText={(value) => setValue('description', value)}
        />
      </Card>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <AppButton
        label={saving ? 'Opslaan...' : 'Kostenpost opslaan'}
        onPress={handleSave}
        disabled={saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  receiptPreview: {
    width: '100%',
    height: 300,
    borderRadius: 20,
  },
  receiptPlaceholder: {
    height: 140,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: palette.border,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  placeholderText: {
    fontSize: 15,
    color: palette.mutedText,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  extractingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  extractingText: {
    fontSize: 14,
    color: palette.mutedText,
  },
  extractionMessage: {
    fontSize: 14,
    color: palette.mutedText,
  },
  errorText: {
    color: palette.danger,
    fontSize: 15,
    lineHeight: 22,
  },
});
