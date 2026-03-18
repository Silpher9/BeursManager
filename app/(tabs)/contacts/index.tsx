import { useIsFocused } from '@react-navigation/native';
import { Link, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  contactTypeLabels,
  contactTypes,
  type Contact,
  type ContactType,
  type FairFilterOption,
} from '@/src/domains/contacts/types';
import { listContactFairOptions, listContacts } from '@/src/domains/contacts/repository';
import { AppButton } from '@/src/shared/components/AppButton';
import { Card } from '@/src/shared/components/Card';
import { EmptyState } from '@/src/shared/components/EmptyState';
import { FilterChip } from '@/src/shared/components/FilterChip';
import { Screen } from '@/src/shared/components/Screen';
import { useFairDayMode } from '@/src/shared/fair-day/FairDayModeProvider';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';
import { palette } from '@/src/shared/theme/colors';

export default function ContactsIndexScreen() {
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const { activeFair } = useFairDayMode();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ContactType | 'all'>('all');
  const [selectedFairId, setSelectedFairId] = useState<string | 'all'>('all');
  const [fairOptions, setFairOptions] = useState<FairFilterOption[]>([]);
  const [fairPickerVisible, setFairPickerVisible] = useState(false);

  useAsyncEffect(async (isMounted) => {
    if (!isFocused) return;

    setLoading(true);
    setError(null);

    try {
      const [nextContacts, nextFairOptions] = await Promise.all([
        listContacts(db),
        listContactFairOptions(db),
      ]);
      if (!isMounted()) return;
      setContacts(nextContacts);
      setFairOptions(nextFairOptions);
    } catch {
      if (!isMounted()) return;
      setError('Contacten konden niet geladen worden.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [db, isFocused]);

  const visibleContacts = useMemo(() => {
    let filtered = contacts;

    if (selectedType !== 'all') {
      filtered = filtered.filter((contact) => contact.type === selectedType);
    }

    if (selectedFairId !== 'all') {
      filtered = filtered.filter((contact) => contact.fairId === selectedFairId);
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      filtered = filtered.filter((contact) =>
        [contact.name, contact.email, contact.phone]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery))
      );
    }

    return filtered;
  }, [contacts, selectedType, selectedFairId, searchQuery]);

  const stats = useMemo(() => {
    const total = contacts.length;
    const kopers = contacts.filter((c) => c.type === 'koper').length;
    const geinteresseerden = contacts.filter((c) => c.type === 'geinteresseerde').length;
    const galeriehouders = contacts.filter((c) => c.type === 'galeriehouder').length;

    return { total, kopers, geinteresseerden, galeriehouders };
  }, [contacts]);

  return (
    <Screen scroll>
      <Card>
        <Text style={styles.heroTitle}>Contacten</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>totaal</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{stats.kopers}</Text>
            <Text style={styles.statLabel}>kopers</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{stats.geinteresseerden}</Text>
            <Text style={styles.statLabel}>geïnteresseerd</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{stats.galeriehouders}</Text>
            <Text style={styles.statLabel}>galeriehouders</Text>
          </View>
        </View>
        <Link
          href={activeFair ? `/contacts/new?fairId=${activeFair.fairId}` : '/contacts/new'}
          asChild>
          <AppButton label="Toevoegen" compact />
        </Link>
      </Card>

      {loading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.stateText}>Contacten laden...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      {!loading && !error && contacts.length === 0 ? (
        <EmptyState
          title="Nog geen contacten"
          description="Voeg vanuit deze tab of direct tijdens een beursdag een contact toe."
          actionLabel="Nieuw contact"
          onAction={() =>
            router.push(activeFair ? `/contacts/new?fairId=${activeFair.fairId}` : '/contacts/new')
          }
        />
      ) : null}

      {!loading && !error && contacts.length > 0 ? (
        <>
          <Card>
            <TextInput
              placeholder="Zoek op naam, e-mail of telefoon"
              placeholderTextColor={palette.placeholder}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Type</Text>
              <View style={styles.filterRow}>
                <FilterChip
                  label="Alles"
                  active={selectedType === 'all'}
                  onPress={() => setSelectedType('all')}
                />
                {contactTypes.map((type) => (
                  <FilterChip
                    key={type}
                    label={contactTypeLabels[type]}
                    active={selectedType === type}
                    onPress={() => setSelectedType(type)}
                  />
                ))}
              </View>
            </View>
            {fairOptions.length > 0 ? (
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Beurs</Text>
                <FairDropdown
                  fairOptions={fairOptions}
                  selectedFairId={selectedFairId}
                  onOpen={() => setFairPickerVisible(true)}
                />
              </View>
            ) : null}
          </Card>

          {visibleContacts.length === 0 ? (
            <EmptyState
              title="Geen treffers"
              description="Pas je zoekterm of filter aan om andere contacten te tonen."
              actionLabel="Filters wissen"
              onAction={() => {
                setSearchQuery('');
                setSelectedType('all');
                setSelectedFairId('all');
              }}
            />
          ) : null}

          {visibleContacts.length > 0 ? (
            <View style={styles.list}>
              {visibleContacts.map((contact) => (
                <Pressable
                  key={contact.id}
                  onPress={() => router.push(`/contacts/${contact.id}`)}
                  style={({ pressed }) => pressed && styles.cardPressed}>
                  <Card>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactMeta}>{contactTypeLabels[contact.type]}</Text>
                    {contact.fairName ? (
                      <Text style={styles.contactFair}>
                        Ontstaan op beurs: {contact.fairName}
                      </Text>
                    ) : null}
                    {contact.purchasedArtworkTitles.length > 0 ? (
                      <Text style={styles.contactPurchase}>
                        Kocht: {contact.purchasedArtworkTitles.join(', ')}
                      </Text>
                    ) : null}
                    {contact.email ? (
                      <Text style={styles.contactMeta}>{contact.email}</Text>
                    ) : null}
                    {contact.phone ? (
                      <Text style={styles.contactMeta}>{contact.phone}</Text>
                    ) : null}
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      <Modal visible={fairPickerVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setFairPickerVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Pressable
              style={[styles.modalOption, selectedFairId === 'all' && styles.modalOptionActive]}
              onPress={() => {
                setSelectedFairId('all');
                setFairPickerVisible(false);
              }}>
              <Text
                style={[
                  styles.modalOptionText,
                  selectedFairId === 'all' && styles.modalOptionTextActive,
                ]}>
                Alle beurzen
              </Text>
            </Pressable>
            {fairOptions.map((option) => (
              <Pressable
                key={option.id}
                style={[
                  styles.modalOption,
                  selectedFairId === option.id && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setSelectedFairId(option.id);
                  setFairPickerVisible(false);
                }}>
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedFairId === option.id && styles.modalOptionTextActive,
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function FairDropdown({
  fairOptions,
  selectedFairId,
  onOpen,
}: {
  fairOptions: FairFilterOption[];
  selectedFairId: string | 'all';
  onOpen: () => void;
}) {
  const selectedLabel =
    selectedFairId === 'all'
      ? 'Alle beurzen'
      : fairOptions.find((f) => f.id === selectedFairId)?.label ?? 'Alle beurzen';

  return (
    <Pressable onPress={onOpen} style={styles.dropdownTrigger}>
      <Text style={styles.dropdownText}>{selectedLabel}</Text>
      <Text style={styles.dropdownChevron}>▼</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  statBlock: {
    flex: 1,
    minWidth: 120,
    minHeight: 86,
    borderRadius: 18,
    backgroundColor: palette.softAccent,
    padding: 14,
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: palette.text,
  },
  statLabel: {
    fontSize: 13,
    color: palette.mutedText,
  },
  searchInput: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FCFAF6',
    color: palette.text,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FCFAF6',
    paddingHorizontal: 14,
  },
  dropdownText: {
    fontSize: 15,
    color: palette.text,
    flex: 1,
  },
  dropdownChevron: {
    fontSize: 12,
    color: palette.mutedText,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 8,
    width: '100%',
    maxWidth: 400,
    maxHeight: '60%',
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  modalOptionActive: {
    backgroundColor: palette.accent,
  },
  modalOptionText: {
    fontSize: 16,
    color: palette.text,
  },
  modalOptionTextActive: {
    color: '#FFFDF9',
    fontWeight: '600',
  },
  centeredState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  stateText: {
    color: palette.mutedText,
  },
  errorText: {
    color: palette.danger,
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: 12,
  },
  cardPressed: {
    opacity: 0.85,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  contactMeta: {
    fontSize: 14,
    color: palette.mutedText,
  },
  contactFair: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: palette.accent,
  },
  contactPurchase: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 22,
    color: palette.text,
  },
});
