import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { listContacts } from '@/src/domains/contacts/repository';
import { type Contact } from '@/src/domains/contacts/types';
import { getFairById } from '@/src/domains/fairs/repository';
import {
  SaleContactCard,
  SalePaymentMethodCard,
  SalePaymentStatusCard,
  SalePricingCard,
} from '@/src/domains/sales/components';
import {
  createSaleForFair,
  listSaleCandidatesForFair,
} from '@/src/domains/sales/repository';
import {
  clearSaleContact,
  selectExistingSaleContact,
  setSaleEditorValue,
  updateNewSaleContactField,
} from '@/src/domains/sales/form-state';
import {
  computeSalePrice,
  emptySaleEditorValues,
  type SaleCandidate,
  type SaleEditorValues,
  validateSaleEditorValues,
} from '@/src/domains/sales/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { Card } from '@/src/shared/components/Card';
import { EmptyState } from '@/src/shared/components/EmptyState';
import { BreadcrumbHeader } from '@/src/shared/components/BreadcrumbHeader';
import { Screen } from '@/src/shared/components/Screen';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';
import { formatPrice } from '@/src/shared/formatters';
import { palette } from '@/src/shared/theme/colors';

type Props = {
  fairId?: string;
};

export function SaleEditorScreen({ fairId }: Props) {
  const db = useSQLiteContext();
  const [candidates, setCandidates] = useState<SaleCandidate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [values, setValues] = useState<SaleEditorValues>(emptySaleEditorValues);
  const [fairName, setFairName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useAsyncEffect(async (isMounted) => {
    setFairName(null);

    if (!fairId) {
      setError('Ongeldige beurs.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextCandidates, nextContacts, fair] = await Promise.all([
        listSaleCandidatesForFair(db, fairId),
        listContacts(db),
        getFairById(db, fairId),
      ]);
      if (!isMounted()) return;
      setCandidates(nextCandidates);
      setContacts(nextContacts);
      setFairName(fair?.name ?? null);
      if (nextCandidates.length > 0) {
        const firstCandidate = nextCandidates[0];
        setValues((currentValues) => ({
          ...currentValues,
          artworkId: currentValues.artworkId || firstCandidate.artworkId,
          askingPrice:
            currentValues.artworkId || currentValues.askingPrice
              ? currentValues.askingPrice
              : firstCandidate.askingPrice?.toString() ?? '',
        }));
      }
    } catch {
      if (!isMounted()) return;
      setError('Beschikbare werken konden niet geladen worden.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [db, fairId]);

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.artworkId === values.artworkId) ?? null,
    [candidates, values.artworkId]
  );
  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === values.contactId) ?? null,
    [contacts, values.contactId]
  );

  const computedSalePrice = computeSalePrice(values);

  const setValue = <Key extends keyof SaleEditorValues>(key: Key, value: SaleEditorValues[Key]) => {
    setValues((currentValues) => setSaleEditorValue(currentValues, key, value));
  };

  const handleSelectCandidate = (candidate: SaleCandidate) => {
    setValues((currentValues) => ({
      ...currentValues,
      artworkId: candidate.artworkId,
      askingPrice:
        currentValues.artworkId === candidate.artworkId && currentValues.askingPrice
          ? currentValues.askingPrice
          : candidate.askingPrice?.toString() ?? '',
      discount: currentValues.artworkId === candidate.artworkId ? currentValues.discount : '0',
    }));
  };

  const handleSelectExistingContact = (contactId: string) => {
    setValues((currentValues) => selectExistingSaleContact(currentValues, contactId));
  };

  const handleSave = async () => {
    if (!fairId) {
      setError('Ongeldige beurs.');
      return;
    }

    const validationError = validateSaleEditorValues(values);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createSaleForFair(db, fairId, values);
      router.replace(`/fairs/${fairId}`);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Onbekende fout tijdens opslaan.';

      console.error('Sale create failed', caughtError);
      setError(`Verkoop registreren mislukt: ${message}`);
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

  const header = (
    <BreadcrumbHeader
      breadcrumbs={[
        { label: 'Beurzen', onPress: () => router.replace('/fairs') },
        {
          label: fairName ?? 'Beurs',
          onPress: fairId ? goToFairDetail : undefined,
        },
        { label: 'Verkoop registreren' },
      ]}
      screenTitle="Verkoop registreren"
      action={{ label: 'Annuleren', onPress: goToFairDetail }}
    />
  );

  if (loading) {
    return (
      <Screen scroll>
        {header}
        <View style={styles.centeredState}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.stateText}>Verkoopscherm laden...</Text>
        </View>
      </Screen>
    );
  }

  if (candidates.length === 0) {
    return (
      <Screen scroll>
        {header}
        <EmptyState
          title="Geen verkoopbare werken"
          description="Koppel eerst een of meer niet-verkochte kunstwerken aan deze beurs."
          actionLabel="Terug naar beurs"
          onAction={goToFairDetail}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {header}

      <SaleCandidateSelectionCard
        candidates={candidates}
        selectedArtworkId={values.artworkId}
        onSelectCandidate={handleSelectCandidate}
      />

      <SalePricingCard
        askingPrice={values.askingPrice}
        discount={values.discount}
        salePrice={computedSalePrice}
        summaryLabel="Uiteindelijke verkoopprijs"
        onChangeAskingPrice={(value) => setValue('askingPrice', value)}
        onChangeDiscount={(value) => setValue('discount', value)}
      />

      <SalePaymentStatusCard
        value={values.paymentStatus}
        onChange={(value) => setValue('paymentStatus', value)}
      />

      <SalePaymentMethodCard
        value={values.paymentMethod}
        onChange={(value) => setValue('paymentMethod', value)}
        hintText="Tijdstip van verkoop wordt automatisch vastgelegd bij opslaan."
        secondaryHintText={selectedCandidate ? `Geselecteerd: ${selectedCandidate.title}` : null}
      />

      <SaleContactCard
        contacts={contacts}
        selectedContactId={values.contactId}
        newContactName={values.contactName}
        newContactEmail={values.contactEmail}
        newContactPhone={values.contactPhone}
        selectedContact={selectedContact}
        selectedContactHint={
          selectedContact
            ? `Gekoppeld bestaand contact: ${selectedContact.name}${
                selectedContact.fairName ? ` · ontstaan op ${selectedContact.fairName}` : ''
              }`
            : null
        }
        nameLabel="Of maak direct nieuwe koper aan"
        bodyText="Koppel een bestaand contact of maak de koper direct aan tijdens de verkoop. De aankoop wordt daarna ook aan het contact gekoppeld."
        onSelectNoContact={() => setValues((currentValues) => clearSaleContact(currentValues))}
        onSelectExistingContact={handleSelectExistingContact}
        onChangeName={(value) =>
          setValues((currentValues) => updateNewSaleContactField(currentValues, 'contactName', value))
        }
        onChangeEmail={(value) =>
          setValues((currentValues) => updateNewSaleContactField(currentValues, 'contactEmail', value))
        }
        onChangePhone={(value) =>
          setValues((currentValues) => updateNewSaleContactField(currentValues, 'contactPhone', value))
        }
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <AppButton
        label={saving ? 'Opslaan...' : 'Verkoop opslaan'}
        onPress={handleSave}
        disabled={saving}
      />
    </Screen>
  );
}

type SaleCandidateSelectionCardProps = {
  candidates: SaleCandidate[];
  selectedArtworkId: string;
  onSelectCandidate: (candidate: SaleCandidate) => void;
};

function SaleCandidateSelectionCard({
  candidates,
  selectedArtworkId,
  onSelectCandidate,
}: SaleCandidateSelectionCardProps) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Kunstwerk</Text>
      <View style={styles.candidateList}>
        {candidates.map((candidate) => (
          <Pressable
            key={candidate.artworkId}
            onPress={() => onSelectCandidate(candidate)}
            style={({ pressed }) => [
              styles.candidateCard,
              selectedArtworkId === candidate.artworkId && styles.candidateCardActive,
              pressed && styles.candidateCardPressed,
            ]}>
            <View style={styles.thumbWrap}>
              {candidate.thumbnailPath || candidate.photoPath ? (
                <Image
                  source={{ uri: candidate.thumbnailPath ?? candidate.photoPath ?? undefined }}
                  style={styles.thumb}
                />
              ) : (
                <View style={styles.thumbPlaceholder}>
                  <Text style={styles.thumbPlaceholderText}>Geen foto</Text>
                </View>
              )}
            </View>
            <View style={styles.candidateContent}>
              <Text style={styles.candidateTitle}>{candidate.title}</Text>
              <Text style={styles.candidateMeta}>
                {[candidate.series, candidate.status, formatPrice(candidate.askingPrice)]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  stateText: {
    color: palette.mutedText,
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  candidateList: {
    gap: 10,
  },
  candidateCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    backgroundColor: palette.surface,
  },
  candidateCardActive: {
    borderColor: palette.accent,
    backgroundColor: '#F2ECE2',
  },
  candidateCardPressed: {
    opacity: 0.85,
  },
  thumbWrap: {
    width: 64,
    height: 64,
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: palette.softAccent,
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: palette.softAccent,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  thumbPlaceholderText: {
    textAlign: 'center',
    fontSize: 11,
    color: palette.mutedText,
  },
  candidateContent: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  candidateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  candidateMeta: {
    fontSize: 13,
    color: palette.mutedText,
  },
  errorText: {
    color: palette.danger,
    fontSize: 15,
    lineHeight: 22,
  },
});
