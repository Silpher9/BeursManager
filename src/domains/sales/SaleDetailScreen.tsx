import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { listContacts } from '@/src/domains/contacts/repository';
import { type Contact } from '@/src/domains/contacts/types';
import {
  SaleContactCard,
  SalePaymentMethodCard,
  SalePaymentStatusCard,
  SalePricingCard,
} from '@/src/domains/sales/components';
import {
  clearNullableSaleContact,
  selectExistingNullableSaleContact,
  setNullableSaleEditorValue,
  updateNewNullableSaleContactField,
} from '@/src/domains/sales/form-state';
import { getSaleById, updateSale } from '@/src/domains/sales/repository';
import {
  computeSalePrice,
  paymentMethodLabels,
  paymentStatusLabels,
  toSaleEditorValues,
  type SaleDetail,
  type SaleEditorValues,
  validateSaleEditorValues,
} from '@/src/domains/sales/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { BreadcrumbHeader } from '@/src/shared/components/BreadcrumbHeader';
import { Card } from '@/src/shared/components/Card';
import { EmptyState } from '@/src/shared/components/EmptyState';
import { Screen } from '@/src/shared/components/Screen';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';
import { formatPrice } from '@/src/shared/formatters';
import { palette } from '@/src/shared/theme/colors';

type Props = {
  fairId?: string;
  saleId?: string;
};

export function SaleDetailScreen({ fairId, saleId }: Props) {
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [values, setValues] = useState<SaleEditorValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useAsyncEffect(async (isMounted) => {
    if (!isFocused) return;

    if (!saleId) {
      setError('Ongeldige verkoop.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextSale, nextContacts] = await Promise.all([getSaleById(db, saleId), listContacts(db)]);
      if (!isMounted()) return;
      setSale(nextSale);
      setContacts(nextContacts);
      setValues(nextSale ? toSaleEditorValues(nextSale) : null);
      if (!nextSale) {
        setError('Deze verkoop kon niet gevonden worden.');
      }
    } catch {
      if (!isMounted()) return;
      setError('De verkoop kon niet geladen worden.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [db, isFocused, saleId]);

  const computedSalePrice = useMemo(() => (values ? computeSalePrice(values) : 0), [values]);
  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === values?.contactId) ?? null,
    [contacts, values]
  );

  const setValue = <Key extends keyof SaleEditorValues>(key: Key, value: SaleEditorValues[Key]) => {
    setValues((currentValues) => setNullableSaleEditorValue(currentValues, key, value));
  };

  const handleSave = async () => {
    if (!saleId || !values) {
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
      await updateSale(db, saleId, values);
      const nextSale = await getSaleById(db, saleId);

      setSale(nextSale);
      setValues(nextSale ? toSaleEditorValues(nextSale) : null);
      setEditing(false);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Onbekende fout tijdens opslaan.';

      console.error('Sale update failed', caughtError);
      setError(`Verkoop bijwerken mislukt: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const goToFairs = () => router.replace('/fairs');
  const goToFair = () => router.replace(fairId ? `/fairs/${fairId}` : '/fairs');

  if (loading) {
    return (
      <Screen scroll>
        <BreadcrumbHeader
          breadcrumbs={[
            { label: 'Beurzen', onPress: goToFairs },
            { label: 'Verkoop laden...' },
          ]}
          action={{ label: 'Terug naar beurs', onPress: goToFair }}
        />
        <View style={styles.loadingState}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.stateText}>Verkoop laden...</Text>
        </View>
      </Screen>
    );
  }

  if (!sale || !values) {
    return (
      <Screen scroll>
        <BreadcrumbHeader
          breadcrumbs={[
            { label: 'Beurzen', onPress: goToFairs },
            { label: 'Verkoop niet gevonden' },
          ]}
          action={{ label: 'Terug naar beurs', onPress: goToFair }}
        />
        <EmptyState
          title="Verkoop niet gevonden"
          description={error ?? 'De gevraagde verkoop kon niet worden geladen.'}
          actionLabel="Terug naar beurs"
          onAction={goToFair}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <BreadcrumbHeader
        breadcrumbs={[
          { label: 'Beurzen', onPress: goToFairs },
          { label: sale.fairName ?? 'Beurs', onPress: goToFair },
          { label: 'Verkoop' },
        ]}
        screenTitle={sale.artworkTitle}
        action={{ label: 'Terug naar beurs', onPress: goToFair }}
      />
      <SaleDetailHeroCard sale={sale} fairId={fairId} />
      <SaleSummaryCard sale={sale} />
      <SaleCorrectionCard
        editing={editing}
        onToggleEditing={() => {
          setEditing((current) => !current);
          setError(null);
          setValues(toSaleEditorValues(sale));
        }}
      />

      {editing ? (
        <>
          <SalePricingCard
            askingPrice={values.askingPrice}
            discount={values.discount}
            salePrice={computedSalePrice}
            summaryLabel="Nieuwe verkoopprijs"
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
          />

          <SaleContactCard
            contacts={contacts}
            selectedContactId={values.contactId}
            newContactName={values.contactName}
            newContactEmail={values.contactEmail}
            newContactPhone={values.contactPhone}
            selectedContact={selectedContact}
            selectedContactHint={
              selectedContact ? `Gekoppeld bestaand contact: ${selectedContact.name}` : null
            }
            nameLabel="Of maak nieuwe koper aan"
            onSelectNoContact={() => setValues((currentValues) => clearNullableSaleContact(currentValues))}
            onSelectExistingContact={(contactId) =>
              setValues((currentValues) =>
                selectExistingNullableSaleContact(currentValues, contactId)
              )
            }
            onChangeName={(value) =>
              setValues((currentValues) =>
                updateNewNullableSaleContactField(currentValues, 'contactName', value)
              )
            }
            onChangeEmail={(value) =>
              setValues((currentValues) =>
                updateNewNullableSaleContactField(currentValues, 'contactEmail', value)
              )
            }
            onChangePhone={(value) =>
              setValues((currentValues) =>
                updateNewNullableSaleContactField(currentValues, 'contactPhone', value)
              )
            }
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <AppButton
            label={saving ? 'Opslaan...' : 'Verkoop bijwerken'}
            onPress={handleSave}
            disabled={saving}
          />
        </>
      ) : null}
    </Screen>
  );
}

function SaleDetailHeroCard({ sale, fairId }: { sale: SaleDetail; fairId?: string }) {
  return (
    <Card>
      <Text style={styles.kicker}>Verkoopdetail</Text>
      <Text style={styles.title}>{sale.artworkTitle}</Text>
      {sale.artworkPhotoPath ? <Image source={{ uri: sale.artworkPhotoPath }} style={styles.image} /> : null}
      <Text style={styles.meta}>{sale.fairName ?? fairId ?? 'Beurs onbekend'}</Text>
      <Text style={styles.meta}>{formatSaleTimestamp(sale.soldAt)}</Text>
    </Card>
  );
}

function SaleSummaryCard({ sale }: { sale: SaleDetail }) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Overzicht</Text>
      <View style={styles.summaryGrid}>
        <MetaItem label="Vraagprijs" value={formatPrice(sale.askingPrice, 'EUR 0') ?? 'EUR 0'} />
        <MetaItem label="Korting" value={formatPrice(sale.discount, 'EUR 0') ?? 'EUR 0'} />
        <MetaItem label="Verkoopprijs" value={formatPrice(sale.salePrice, 'EUR 0') ?? 'EUR 0'} />
        <MetaItem label="Betaalstatus" value={paymentStatusLabels[sale.paymentStatus]} />
        <MetaItem label="Betaalmethode" value={paymentMethodLabels[sale.paymentMethod]} />
        <MetaItem label="Contact" value={sale.contactName ?? 'Niet gekoppeld'} />
      </View>
    </Card>
  );
}

type SaleCorrectionCardProps = {
  editing: boolean;
  onToggleEditing: () => void;
};

function SaleCorrectionCard({ editing, onToggleEditing }: SaleCorrectionCardProps) {
  return (
    <Card>
      <View style={styles.editHeader}>
        <Text style={styles.sectionTitle}>Correctie</Text>
        <AppButton
          label={editing ? 'Annuleer bewerken' : 'Bewerken'}
          onPress={onToggleEditing}
          compact
          variant="secondary"
        />
      </View>
      <Text style={styles.warningText}>
        Pas een verkoop alleen aan als correctie nodig is. Je wijzigt historische
        transactiegegevens.
      </Text>
    </Card>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function formatSaleTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const styles = StyleSheet.create({
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  stateText: {
    color: palette.mutedText,
    fontSize: 15,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.accent,
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  image: {
    width: '100%',
    height: 280,
    borderRadius: 18,
    marginTop: 14,
    backgroundColor: palette.softAccent,
  },
  meta: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.mutedText,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  summaryGrid: {
    gap: 12,
  },
  metaItem: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    gap: 4,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 16,
    lineHeight: 24,
    color: palette.text,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  warningText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    color: palette.danger,
  },
  errorText: {
    color: palette.danger,
    fontSize: 15,
    lineHeight: 22,
  },
});
