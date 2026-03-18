import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { dateToLocalIso } from '@/src/shared/date';
import { formatFairDate } from '@/src/domains/fairs/formatters';
import { getFairById, saveFair } from '@/src/domains/fairs/repository';
import {
  emptyFairEditorValues,
  type FairEditorValues,
  toFairEditorValues,
  validateFairEditorValues,
} from '@/src/domains/fairs/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { Card } from '@/src/shared/components/Card';
import { BreadcrumbHeader } from '@/src/shared/components/BreadcrumbHeader';
import { Field } from '@/src/shared/components/Field';
import { palette } from '@/src/shared/theme/colors';
import { Screen } from '@/src/shared/components/Screen';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';

type Props = {
  fairId?: string;
};

export function FairEditorScreen({ fairId }: Props) {
  const db = useSQLiteContext();
  const [values, setValues] = useState<FairEditorValues>(emptyFairEditorValues);
  const [loading, setLoading] = useState(Boolean(fairId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDateField, setActiveDateField] = useState<'startDate' | 'endDate' | null>(null);

  useAsyncEffect(async (isMounted) => {
    if (!fairId) {
      setValues(emptyFairEditorValues);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fair = await getFairById(db, fairId);
      if (!isMounted()) return;
      if (!fair) {
        setError('Deze beurs kon niet gevonden worden.');
        return;
      }
      setValues(toFairEditorValues(fair));
    } catch {
      if (!isMounted()) return;
      setError('De beurs kon niet geladen worden.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [db, fairId]);

  const setValue = <Key extends keyof FairEditorValues>(key: Key, value: FairEditorValues[Key]) => {
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
  };

  const goBack = () => {
    if (fairId) {
      router.replace({ pathname: '/fairs/[id]', params: { id: fairId } });
      return;
    }
    router.replace('/fairs');
  };

  const handleNativeDateChange =
    (field: 'startDate' | 'endDate') => (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (event.type === 'dismissed') {
        setActiveDateField(null);
        return;
      }

      if (selectedDate) {
        setValue(field, dateToLocalIso(selectedDate));
      }

      if (Platform.OS !== 'ios') {
        setActiveDateField(null);
      }
    };

  const handleSave = async () => {
    const validationError = validateFairEditorValues(values);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const savedFairId = await saveFair(db, values, fairId);
      router.replace(`/fairs/${savedFairId}`);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Onbekende fout tijdens opslaan.';

      console.error('Fair save failed', caughtError);
      setError(`Opslaan mislukt: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll>
        <BreadcrumbHeader
          breadcrumbs={[
            { label: 'Beurzen', onPress: () => router.replace('/fairs') },
            { label: 'Beurs', onPress: fairId ? () => router.replace({ pathname: '/fairs/[id]', params: { id: fairId } }) : undefined },
            { label: 'Bewerken' },
          ]}
          screenTitle="Beurs bewerken"
          action={{ label: 'Annuleren', onPress: goBack }}
        />
        <View style={styles.centeredState}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.stateText}>Beurs laden...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <BreadcrumbHeader
        breadcrumbs={
          fairId
            ? [
                { label: 'Beurzen', onPress: () => router.replace('/fairs') },
                { label: values.name || 'Beurs', onPress: () => router.replace({ pathname: '/fairs/[id]', params: { id: fairId } }) },
                { label: 'Bewerken' },
              ]
            : [
                { label: 'Beurzen', onPress: () => router.replace('/fairs') },
                { label: 'Nieuwe beurs' },
              ]
        }
        screenTitle={fairId ? 'Beurs bewerken' : 'Nieuwe beurs'}
        action={{ label: 'Annuleren', onPress: goBack }}
      />

      <Card>
          <Field
            label="Naam"
            placeholder="Bijv. Art The Hague 2026"
            value={values.name}
            onChangeText={(value) => setValue('name', value)}
          />
          <Field
            label="Locatie"
            placeholder="Bijv. Den Haag"
            value={values.location}
            onChangeText={(value) => setValue('location', value)}
          />
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <DateField
                label="Startdatum"
                value={values.startDate}
                onChangeText={(value) => setValue('startDate', value)}
                onOpenPicker={() => setActiveDateField('startDate')}
                onClear={() => {
                  setValue('startDate', '');
                  if (activeDateField === 'startDate') {
                    setActiveDateField(null);
                  }
                }}
              />
            </View>
            <View style={styles.gridItem}>
              <DateField
                label="Einddatum"
                value={values.endDate}
                onChangeText={(value) => setValue('endDate', value)}
                onOpenPicker={() => setActiveDateField('endDate')}
                onClear={() => {
                  setValue('endDate', '');
                  if (activeDateField === 'endDate') {
                    setActiveDateField(null);
                  }
                }}
              />
            </View>
          </View>
          {Platform.OS !== 'web' && activeDateField ? (
            <View style={styles.datePickerWrap}>
              <Text style={styles.datePickerLabel}>
                {activeDateField === 'startDate' ? 'Kies startdatum' : 'Kies einddatum'}
              </Text>
              <DateTimePicker
                value={toPickerDate(
                  activeDateField === 'startDate' ? values.startDate : values.endDate
                )}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={handleNativeDateChange(activeDateField)}
              />
              {Platform.OS === 'ios' ? (
                <View style={styles.datePickerActions}>
                  <AppButton
                    label="Sluiten"
                    compact
                    variant="secondary"
                    onPress={() => setActiveDateField(null)}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
          <Field
            label="Notities"
            placeholder="Standnummer, praktische afspraken, leerpunten..."
            multiline
            style={styles.notesInput}
            value={values.notes}
            onChangeText={(value) => setValue('notes', value)}
          />
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <AppButton
          label={saving ? 'Opslaan...' : fairId ? 'Wijzigingen opslaan' : 'Beurs opslaan'}
          onPress={handleSave}
          disabled={saving}
        />
      </Screen>
  );
}

function DateField({
  label,
  value,
  onChangeText,
  onOpenPicker,
  onClear,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onOpenPicker: () => void;
  onClear: () => void;
}) {
  if (Platform.OS === 'web') {
    return (
      <Field
        label={label}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        value={value}
        onChangeText={onChangeText}
      />
    );
  }

  return (
    <View style={styles.dateFieldWrap}>
      <View style={styles.dateFieldHeader}>
        <Text style={styles.dateFieldLabel}>{label}</Text>
        {value ? (
          <Pressable onPress={onClear} style={({ pressed }) => [pressed && styles.clearPressed]}>
            <Text style={styles.clearLabel}>Wis</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} kiezen`}
        onPress={onOpenPicker}
        style={({ pressed }) => [styles.dateFieldInput, pressed && styles.dateFieldPressed]}>
        <Text style={value ? styles.dateValueText : styles.datePlaceholderText}>
          {value ? formatFairDate(value) : 'Kies datum'}
        </Text>
      </Pressable>
    </View>
  );
}

function toPickerDate(value: string) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

const styles = StyleSheet.create({
  centeredState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  stateText: {
    color: palette.mutedText,
    fontSize: 15,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },
  dateFieldWrap: {
    gap: 8,
  },
  dateFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  clearLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.accent,
  },
  clearPressed: {
    opacity: 0.75,
  },
  dateFieldInput: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FCFAF6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  dateFieldPressed: {
    opacity: 0.85,
  },
  dateValueText: {
    fontSize: 15,
    color: palette.text,
  },
  datePlaceholderText: {
    fontSize: 15,
    color: palette.placeholder,
  },
  datePickerWrap: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FCFAF6',
    padding: 14,
    gap: 12,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  datePickerActions: {
    alignItems: 'flex-end',
  },
  notesInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  errorText: {
    color: palette.danger,
    fontSize: 15,
    lineHeight: 22,
  },
});
