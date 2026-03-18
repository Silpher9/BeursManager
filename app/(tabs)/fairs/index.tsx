import { useIsFocused } from '@react-navigation/native';
import { Link, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { localIsoDate } from '@/src/shared/date';
import { formatFairDateRange } from '@/src/domains/fairs/formatters';
import { listFairs } from '@/src/domains/fairs/repository';
import { type FairListItem } from '@/src/domains/fairs/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { Card } from '@/src/shared/components/Card';
import { EmptyState } from '@/src/shared/components/EmptyState';
import { FilterChip } from '@/src/shared/components/FilterChip';
import { Screen } from '@/src/shared/components/Screen';

import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';
import { palette } from '@/src/shared/theme/colors';

type FairPeriod = 'all' | 'upcoming' | 'past';

export default function FairsIndexScreen() {
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const [fairs, setFairs] = useState<FairListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<FairPeriod>('upcoming');

  useAsyncEffect(async (isMounted) => {
    if (!isFocused) return;

    setLoading(true);
    setError(null);

    try {
      const nextFairs = await listFairs(db);
      if (!isMounted()) return;
      setFairs(nextFairs);
    } catch {
      if (!isMounted()) return;
      setError('Beurzen konden niet geladen worden.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [db, isFocused]);

  const visibleFairs = useMemo(() => {
    let result = fairs;

    if (selectedPeriod !== 'all') {
      const today = localIsoDate();
      result = result.filter((fair) => {
        if (selectedPeriod === 'upcoming') {
          return !fair.endDate || fair.endDate >= today;
        }
        return fair.endDate != null && fair.endDate < today;
      });
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      result = result.filter((fair) =>
        [fair.name, fair.location]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery))
      );
    }

    return result;
  }, [fairs, searchQuery, selectedPeriod]);

  const heroData = useMemo(() => {
    const today = localIsoDate();
    const allUpcoming = fairs
      .filter((f) => !f.endDate || f.endDate >= today)
      .sort((a, b) => {
        const aKey = a.startDate ?? a.createdAt;
        const bKey = b.startDate ?? b.createdAt;
        return aKey.localeCompare(bKey);
      });
    const nextFair = allUpcoming[0] ?? null;
    const completedCount = fairs.filter((f) => f.endDate != null && f.endDate < today).length;
    return { nextFair, completedCount };
  }, [fairs]);

  const { upcomingFairs, pastFairs } = useMemo(() => {
    if (selectedPeriod !== 'all') {
      return { upcomingFairs: visibleFairs, pastFairs: [] as FairListItem[] };
    }
    const today = localIsoDate();
    return {
      upcomingFairs: visibleFairs.filter((f) => !f.endDate || f.endDate >= today),
      pastFairs: visibleFairs.filter((f) => f.endDate != null && f.endDate < today),
    };
  }, [visibleFairs, selectedPeriod]);

  return (
      <Screen scroll>
        <Card>
          <Text style={styles.pageTitle}>Beurzen</Text>
          {heroData.nextFair ? (
            <>
              <Text style={styles.heroTitle}>Volgende beurs: {heroData.nextFair.name}</Text>
              <Text style={styles.heroText}>
                {heroData.nextFair.location ? `${heroData.nextFair.location} · ` : ''}
                {formatFairDateRange(heroData.nextFair.startDate, heroData.nextFair.endDate)}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.heroTitle}>Geen beurzen gepland</Text>
              <Text style={styles.heroText}>
                Maak een nieuwe beurs aan om je voorraad klaar te zetten.
              </Text>
            </>
          )}
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{heroData.completedCount}</Text>
              <Text style={styles.statLabel}>afgeronde beurzen</Text>
            </View>
          </View>
        </Card>

        <Link href="/fairs/new" asChild>
          <AppButton label="Nieuwe beurs" compact />
        </Link>

        <FairsFilterCard
          searchQuery={searchQuery}
          selectedPeriod={selectedPeriod}
          onChangeSearchQuery={setSearchQuery}
          onChangePeriod={setSelectedPeriod}
        />

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.stateText}>Beurzen laden...</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <Card>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        {!loading && !error && fairs.length === 0 ? (
          <EmptyState
            title="Nog geen beurzen"
            description="Maak je eerste beurs aan en koppel daarna kunstwerken uit je voorraad."
            actionLabel="Nieuwe beurs"
            onAction={() => router.push('/fairs/new')}
          />
        ) : null}

        {!loading && !error && fairs.length > 0 && visibleFairs.length === 0 ? (
          <EmptyState
            title="Geen treffers"
            description="Pas je zoekterm of filter aan om andere beurzen te tonen."
            actionLabel="Filters wissen"
            onAction={() => {
              setSearchQuery('');
              setSelectedPeriod('all');
            }}
          />
        ) : null}

        {!loading && !error && visibleFairs.length > 0 ? (
          <View style={styles.list}>
            {upcomingFairs.length > 0 && selectedPeriod === 'all' ? (
              <Text style={styles.sectionHeader}>Aankomende beurzen</Text>
            ) : null}
            {upcomingFairs.map((fair) => (
              <FairListRow key={fair.id} fair={fair} onPress={() => router.push(`/fairs/${fair.id}`)} />
            ))}

            {pastFairs.length > 0 && selectedPeriod === 'all' ? (
              <Text style={styles.sectionHeaderMuted}>Afgeronde beurzen</Text>
            ) : null}
            {pastFairs.map((fair) => (
              <FairListRow key={fair.id} fair={fair} onPress={() => router.push(`/fairs/${fair.id}`)} />
            ))}
          </View>
        ) : null}
      </Screen>
  );
}

// --- Local sub-components ---

function FairListRow({ fair, onPress }: { fair: FairListItem; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.rowCard, pressed && styles.rowPressed]}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>{fair.name}</Text>
        <Text style={styles.rowCount}>{fair.assignedArtworkCount} werken</Text>
      </View>
      <Text style={styles.rowMeta}>{fair.location || 'Locatie nog leeg'}</Text>
      <Text style={styles.rowMeta}>{formatFairDateRange(fair.startDate, fair.endDate)}</Text>
    </Pressable>
  );
}

type FairsFilterCardProps = {
  searchQuery: string;
  selectedPeriod: FairPeriod;
  onChangeSearchQuery: (value: string) => void;
  onChangePeriod: (value: FairPeriod) => void;
};

function FairsFilterCard({
  searchQuery,
  selectedPeriod,
  onChangeSearchQuery,
  onChangePeriod,
}: FairsFilterCardProps) {
  return (
    <Card>
      <TextInput
        placeholder="Zoek op naam of locatie"
        placeholderTextColor={palette.placeholder}
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={onChangeSearchQuery}
      />
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Periode</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          <FilterChip label="Alles" active={selectedPeriod === 'all'} onPress={() => onChangePeriod('all')} />
          <FilterChip label="Aankomend" active={selectedPeriod === 'upcoming'} onPress={() => onChangePeriod('upcoming')} />
          <FilterChip label="Afgelopen" active={selectedPeriod === 'past'} onPress={() => onChangePeriod('past')} />
        </ScrollView>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.text,
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  heroText: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
    color: palette.mutedText,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  statBlock: {
    flex: 1,
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
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: palette.text,
    backgroundColor: palette.background,
  },
  filterGroup: {
    marginTop: 14,
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.mutedText,
  },
  filterRow: {
    gap: 8,
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
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionHeaderMuted: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.mutedText,
    marginTop: 16,
    marginBottom: 4,
  },
  list: {
    gap: 12,
  },
  rowCard: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 6,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  rowTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: palette.text,
  },
  rowCount: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.accent,
  },
  rowMeta: {
    fontSize: 14,
    color: palette.mutedText,
  },
});
