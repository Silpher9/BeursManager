import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getContactById, saveContact, updateContact } from '@/src/domains/contacts/repository';
import {
  contactTypeLabels,
  contactTypes,
  emptyContactEditorValues,
  toContactEditorValues,
  type ContactEditorValues,
  type ContactType,
  validateContactEditorValues,
} from '@/src/domains/contacts/types';
import { listFairs } from '@/src/domains/fairs/repository';
import { type FairListItem } from '@/src/domains/fairs/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { BreadcrumbHeader } from '@/src/shared/components/BreadcrumbHeader';
import { Card } from '@/src/shared/components/Card';
import { ChoiceChip } from '@/src/shared/components/ChoiceChip';
import { Field } from '@/src/shared/components/Field';
import { palette } from '@/src/shared/theme/colors';
import { Screen } from '@/src/shared/components/Screen';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';

type Props = {
  contactId?: string;
  returnToFairId?: string;
};

export function ContactEditorScreen({ contactId, returnToFairId }: Props) {
  const db = useSQLiteContext();
  const isEditing = Boolean(contactId);
  const [values, setValues] = useState<ContactEditorValues>(emptyContactEditorValues);
  const [fairs, setFairs] = useState<FairListItem[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [loadingFairs, setLoadingFairs] = useState(true);
  const [originalName, setOriginalName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useAsyncEffect(async (isMounted) => {
    if (!contactId) {
      setValues(emptyContactEditorValues);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const contact = await getContactById(db, contactId);
      if (!isMounted()) return;
      if (!contact) {
        setError('Dit contact kon niet gevonden worden.');
        return;
      }
      setValues(toContactEditorValues(contact));
      setOriginalName(contact.name);
    } catch {
      if (!isMounted()) return;
      setError('Het contact kon niet geladen worden.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [contactId, db]);

  useEffect(() => {
    if (!isEditing) {
      setValues((currentValues) =>
        returnToFairId && !currentValues.fairId
          ? { ...currentValues, fairId: returnToFairId }
          : currentValues
      );
    }
  }, [returnToFairId, isEditing]);

  useAsyncEffect(async (isMounted) => {
    setLoadingFairs(true);

    try {
      const nextFairs = await listFairs(db);
      if (!isMounted()) return;
      setFairs(nextFairs);
    } catch {
      if (!isMounted()) return;
      setError('Beurzen konden niet geladen worden voor contactkoppeling.');
    } finally {
      if (isMounted()) setLoadingFairs(false);
    }
  }, [db]);

  const setValue = <Key extends keyof ContactEditorValues>(
    key: Key,
    value: ContactEditorValues[Key]
  ) => {
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
  };

  const handleSave = async () => {
    const validationError = validateContactEditorValues(values);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (contactId) {
        await updateContact(db, contactId, values);
      } else {
        await saveContact(db, values);
      }
      if (returnToFairId) {
        router.replace(`/fairs/${returnToFairId}/day`);
      } else if (contactId) {
        router.back();
      } else {
        router.replace('/contacts');
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Onbekende fout tijdens opslaan.';

      console.error('Contact save failed', caughtError);
      setError(`Contact opslaan mislukt: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const goToContacts = () => router.replace('/contacts');
  const goToContact = () => router.replace({ pathname: '/contacts/[id]', params: { id: contactId! } });

  return (
    <Screen scroll>
      <BreadcrumbHeader
        breadcrumbs={[
          { label: 'Contacten', onPress: goToContacts },
          ...(contactId && originalName
            ? [
                { label: originalName, onPress: goToContact },
                { label: 'Bewerken' },
              ]
            : [{ label: 'Nieuw contact' }]),
        ]}
        screenTitle={isEditing ? 'Contact bewerken' : 'Nieuw contact'}
        action={{ label: 'Annuleren', onPress: contactId ? goToContact : goToContacts }}
      />
        <Card>
          <Text style={styles.title}>
            {isEditing ? 'Contact bewerken' : 'Voeg een contact toe'}
          </Text>
          <Text style={styles.body}>
            {isEditing
              ? 'Pas de gegevens van dit contact aan.'
              : 'Gebruik dit voor kopers, geïnteresseerden of galeriehouders tijdens een beursdag.'}
          </Text>
        </Card>

        {loading ? (
          <Card>
            <Text style={styles.body}>Contact laden...</Text>
          </Card>
        ) : null}

        <Card>
          <Field
            label="Naam"
            placeholder="Bijv. Emma Jansen"
            value={values.name}
            onChangeText={(value) => setValue('name', value)}
          />
          <Field
            label="E-mail"
            placeholder="emma@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={values.email}
            onChangeText={(value) => setValue('email', value)}
          />
          <Field
            label="Telefoon"
            placeholder="+31 6 12345678"
            keyboardType="phone-pad"
            value={values.phone}
            onChangeText={(value) => setValue('phone', value)}
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Type contact</Text>
          <View style={styles.choiceRow}>
            {contactTypes.map((type) => (
              <ChoiceChip
                key={type}
                label={contactTypeLabels[type]}
                active={values.type === type}
                onPress={() => setValue('type', type)}
              />
            ))}
          </View>
          <Field
            label="Notities"
            placeholder="Bijv. wil later terugkomen, vraagt catalogus, twijfelt over prijs..."
            multiline
            style={styles.notesInput}
            value={values.notes}
            onChangeText={(value) => setValue('notes', value)}
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Beurscontext</Text>
          <Text style={styles.sectionBody}>
            Leg vast op welke beurs dit contact is ontstaan. Dat maakt opvolging later veel sneller.
          </Text>
          <View style={styles.choiceRow}>
            <ChoiceChip
              label="Geen beurs"
              active={!values.fairId}
              onPress={() => setValue('fairId', '')}
            />
            {fairs.map((fair) => (
              <ChoiceChip
                key={fair.id}
                label={fair.name}
                active={values.fairId === fair.id}
                onPress={() => setValue('fairId', fair.id)}
              />
            ))}
          </View>
          {returnToFairId ? (
            <Text style={styles.contextHint}>
              Dit contact wordt standaard gekoppeld aan de actieve beursdag.
            </Text>
          ) : null}
          {loadingFairs ? <Text style={styles.contextHint}>Beurzen laden...</Text> : null}
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <AppButton
          label={saving ? 'Opslaan...' : 'Contact opslaan'}
          onPress={handleSave}
          disabled={saving}
        />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
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
  sectionBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: palette.mutedText,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  notesInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  contextHint: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    color: palette.mutedText,
  },
  errorText: {
    color: palette.danger,
    fontSize: 15,
    lineHeight: 22,
  },
});
