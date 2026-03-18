import { useIsFocused, useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { formatFairDateRange } from '@/src/domains/fairs/formatters';
import { getFairById, listFairAssignments } from '@/src/domains/fairs/repository';
import { type Fair, type FairAssignmentItem } from '@/src/domains/fairs/types';
import { listSalesForFair } from '@/src/domains/sales/repository';
import { type SaleListItem } from '@/src/domains/sales/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { BreadcrumbHeader } from '@/src/shared/components/BreadcrumbHeader';
import { Card } from '@/src/shared/components/Card';
import { EmptyState } from '@/src/shared/components/EmptyState';
import { useFairDayMode } from '@/src/shared/fair-day/FairDayModeProvider';
import { formatPrice } from '@/src/shared/formatters';
import { useResponsive } from '@/src/shared/hooks/useResponsive';
import { palette } from '@/src/shared/theme/colors';
import { Screen } from '@/src/shared/components/Screen';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';

type Props = {
  fairId?: string;
};

export function FairDayScreen({ fairId }: Props) {
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const { deactivateFairDay, isFairDayActiveFor } = useFairDayMode();
  const navigation = useNavigation();
  const { isTablet } = useResponsive();
  const [fair, setFair] = useState<Fair | null>(null);
  const [assignments, setAssignments] = useState<FairAssignmentItem[]>([]);
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return navigation.addListener('beforeRemove', () => {
      deactivateFairDay();
    });
  }, [navigation, deactivateFairDay]);

  useAsyncEffect(async (isMounted) => {
    if (!isFocused) return;

    if (!fairId) {
      setError('Ongeldige beurs.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextFair, nextAssignments, nextSales] = await Promise.all([
        getFairById(db, fairId),
        listFairAssignments(db, fairId),
        listSalesForFair(db, fairId),
      ]);
      if (!isMounted()) return;
      setFair(nextFair);
      setAssignments(nextAssignments);
      setSales(nextSales);
      if (!nextFair) {
        setError('Deze beurs kon niet gevonden worden.');
      }
    } catch {
      if (!isMounted()) return;
      setError('Beursdag-modus kon niet geladen worden.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [db, fairId, isFocused]);

  const assignedCount = useMemo(
    () => assignments.filter((assignment) => assignment.included).length,
    [assignments]
  );
  const soldCount = sales.length;
  const revenue = useMemo(() => sales.reduce((total, sale) => total + sale.salePrice, 0), [sales]);
  const fairDayActive = isFairDayActiveFor(fair?.id);

  const goToFairs = () => router.replace('/fairs');
  const goToFair = () => router.replace({ pathname: '/fairs/[id]', params: { id: fairId! } });

  if (loading) {
    return (
      <Screen scroll>
        <BreadcrumbHeader
          breadcrumbs={[
            { label: 'Beurzen', onPress: goToFairs },
            { label: 'Beursdag laden...' },
          ]}
          action={{ label: 'Terug naar beurzen', onPress: goToFairs }}
        />
        <View style={styles.loadingState}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.stateText}>Beursdag-modus laden...</Text>
        </View>
      </Screen>
    );
  }

  if (!fair) {
    return (
      <Screen scroll>
        <BreadcrumbHeader
          breadcrumbs={[
            { label: 'Beurzen', onPress: goToFairs },
            { label: 'Beurs niet gevonden' },
          ]}
          action={{ label: 'Terug naar beurzen', onPress: goToFairs }}
        />
        <EmptyState
          title="Beurs niet gevonden"
          description={error ?? 'De gevraagde beurs kon niet worden geladen.'}
          actionLabel="Terug naar beurzen"
          onAction={() => router.replace('/fairs')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <BreadcrumbHeader
        breadcrumbs={[
          { label: 'Beurzen', onPress: goToFairs },
          { label: fair.name, onPress: goToFair },
          { label: 'Beursdag' },
        ]}
        action={{ label: 'Terug naar beurs', onPress: goToFair }}
      />
      <Card>
          <Text style={styles.kicker}>Beursdag-modus</Text>
          <Text accessibilityRole="header" style={styles.title}>{fair.name}</Text>
          <Text style={styles.meta}>{fair.location || 'Locatie nog leeg'}</Text>
          <Text style={styles.meta}>{formatFairDateRange(fair.startDate, fair.endDate)}</Text>
        </Card>

        <View style={[styles.primaryActions, isTablet && styles.primaryActionsRow]}>
          <AppButton
            label="Verkoop registreren"
            onPress={() => router.push(`/fairs/${fair.id}/sales/new`)}
            stretch={isTablet}
          />
          <AppButton
            label="Contact toevoegen"
            onPress={() => router.push(`/contacts/new?fairId=${fair.id}`)}
            stretch={isTablet}
          />
          <AppButton
            label="Overzicht"
            onPress={() => router.push(`/fairs/${fair.id}`)}
            variant="secondary"
            stretch={isTablet}
          />
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Vandaag in beeld</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{assignedCount}</Text>
              <Text style={styles.metricLabel}>werken mee</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{soldCount}</Text>
              <Text style={styles.metricLabel}>verkopen</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{formatPrice(revenue, 'EUR 0')}</Text>
              <Text style={styles.metricLabel}>omzet</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Snelle status</Text>
          <Text style={styles.statusLine}>
            {assignedCount === 0
              ? 'Nog geen kunstwerken gekoppeld aan deze beurs.'
              : `${assignedCount} gekoppeld, ${soldCount} verkocht, ${assignedCount - soldCount} nog beschikbaar tijdens de beurs.`}
          </Text>
        </Card>
    </Screen>
  );
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
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    color: palette.text,
  },
  meta: {
    fontSize: 15,
    lineHeight: 24,
    color: palette.mutedText,
  },
  primaryActions: {
    gap: 12,
  },
  primaryActionsRow: {
    flexDirection: 'row',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minHeight: 88,
    borderRadius: 18,
    backgroundColor: palette.softAccent,
    padding: 14,
    justifyContent: 'space-between',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
  },
  metricLabel: {
    fontSize: 13,
    color: palette.mutedText,
  },
  statusLine: {
    fontSize: 15,
    lineHeight: 24,
    color: palette.mutedText,
  },
});
