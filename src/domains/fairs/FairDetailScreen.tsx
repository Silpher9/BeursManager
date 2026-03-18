import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { listExpensesForFair } from '@/src/domains/expenses/repository';
import { type ExpenseListItem } from '@/src/domains/expenses/types';
import {
  FairAssignmentCard,
  FairDayToggleCard,
  FairExpensesCard,
  FairHeaderCard,
  FairMetricsCard,
  FairSalesCard,
  FairSelectionCard,
} from '@/src/domains/fairs/components';
import {
  deleteFair,
  getFairById,
  listFairAssignments,
  setFairArtworkIncluded,
} from '@/src/domains/fairs/repository';
import { type Fair, type FairAssignmentItem } from '@/src/domains/fairs/types';
import { listSalesForFair } from '@/src/domains/sales/repository';
import { type SaleListItem } from '@/src/domains/sales/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { EmptyState } from '@/src/shared/components/EmptyState';
import { BreadcrumbHeader } from '@/src/shared/components/BreadcrumbHeader';
import { Screen } from '@/src/shared/components/Screen';
import { confirmAction } from '@/src/shared/confirmAction';
import { useFairDayMode } from '@/src/shared/fair-day/FairDayModeProvider';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';
import { palette } from '@/src/shared/theme/colors';

type Props = {
  fairId?: string;
};

export function FairDetailScreen({ fairId }: Props) {
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const { activateFairDay, deactivateFairDay, isFairDayActiveFor } = useFairDayMode();
  const [fair, setFair] = useState<Fair | null>(null);
  const [assignments, setAssignments] = useState<FairAssignmentItem[]>([]);
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingArtworkId, setSavingArtworkId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | 'all'>('all');

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
      const [nextFair, nextAssignments, nextSales, nextExpenses] = await Promise.all([
        getFairById(db, fairId),
        listFairAssignments(db, fairId),
        listSalesForFair(db, fairId),
        listExpensesForFair(db, fairId),
      ]);

      if (!isMounted()) return;

      setFair(nextFair);
      setAssignments(nextAssignments);
      setSales(nextSales);
      setExpenses(nextExpenses);

      if (!nextFair) {
        setError('Deze beurs bestaat niet meer.');
      }
    } catch {
      if (!isMounted()) return;
      setError('De beurs kon niet geladen worden.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [db, fairId, isFocused]);

  const assignedItems = useMemo(
    () => assignments.filter((assignment) => assignment.included),
    [assignments]
  );
  const assignmentArtistOptions = useMemo(
    () =>
      Array.from(
        new Set(assignments.map((assignment) => assignment.artistName).filter(Boolean))
      ) as string[],
    [assignments]
  );
  const visibleAssignments = useMemo(
    () =>
      selectedArtist === 'all'
        ? assignments
        : assignments.filter((assignment) => assignment.artistName === selectedArtist),
    [assignments, selectedArtist]
  );
  const visibleAssignedItems = useMemo(
    () =>
      selectedArtist === 'all'
        ? assignedItems
        : assignedItems.filter((assignment) => assignment.artistName === selectedArtist),
    [assignedItems, selectedArtist]
  );

  const salesTotal = useMemo(
    () => sales.reduce((total, sale) => total + sale.salePrice, 0),
    [sales]
  );
  const expensesTotal = useMemo(
    () => expenses.reduce((total, expense) => total + expense.amount, 0),
    [expenses]
  );
  const fairResult = salesTotal - expensesTotal;
  const fairDayActive = isFairDayActiveFor(fair?.id);

  const handleToggleArtwork = async (assignment: FairAssignmentItem) => {
    if (!fairId || savingArtworkId || assignment.sold) {
      return;
    }

    const nextIncluded = !assignment.included;
    setSavingArtworkId(assignment.artworkId);
    setError(null);

    try {
      await setFairArtworkIncluded(db, fairId, assignment.artworkId, nextIncluded);
      setAssignments((currentAssignments) =>
        currentAssignments.map((currentAssignment) =>
          currentAssignment.artworkId === assignment.artworkId
            ? { ...currentAssignment, included: nextIncluded }
            : currentAssignment
        )
      );
    } catch {
      setError('Kunstwerk kon niet aan de beurs worden gekoppeld.');
    } finally {
      setSavingArtworkId(null);
    }
  };

  const confirmDelete = () => {
    if (!fairId || !fair || deleting) {
      return;
    }

    confirmAction(
      'Beurs verwijderen',
      `Verwijder "${fair.name}" inclusief gekoppelde selecties en verkopen?`,
      'Verwijderen',
      async () => {
        try {
          setDeleting(true);
          await deleteFair(db, fairId);
          router.replace('/fairs');
        } catch {
          setDeleting(false);
          setError('Verwijderen mislukt. Probeer het opnieuw.');
        }
      }
    );
  };

  if (loading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator color={palette.accent} />
        <Text style={styles.stateText}>Beurs laden...</Text>
      </View>
    );
  }

  if (!fair) {
    return (
      <Screen scroll>
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
          { label: 'Beurzen', onPress: () => router.replace('/fairs') },
          { label: fair.name },
        ]}
        action={{ label: 'Bewerken', onPress: () => router.push(`/fairs/${fair.id}/edit`) }}
      />
      <FairHeaderCard fair={fair} />

        <FairDayToggleCard
          active={fairDayActive}
          onActivate={() => {
            activateFairDay(fair.id, fair.name);
            router.push(`/fairs/${fair.id}/day`);
          }}
          onDeactivate={deactivateFairDay}
        />

        <FairMetricsCard
          assignedCount={assignedItems.length}
          salesCount={sales.length}
          salesTotal={salesTotal}
          expensesTotal={expensesTotal}
          fairResult={fairResult}
        />

        <FairExpensesCard fairId={fair.id} expenses={expenses} />

        <FairSalesCard fairId={fair.id} sales={sales} />

        <FairSelectionCard
          assignedItems={visibleAssignedItems}
          totalAssignedCount={assignedItems.length}
        />

        <FairAssignmentCard
          assignments={visibleAssignments}
          artistOptions={assignmentArtistOptions}
          selectedArtist={selectedArtist}
          savingArtworkId={savingArtworkId}
          onSelectArtist={setSelectedArtist}
          onToggleArtwork={handleToggleArtwork}
        />

        <View style={styles.actionColumn}>
          <AppButton
            label={deleting ? 'Verwijderen...' : 'Beurs verwijderen'}
            onPress={confirmDelete}
            disabled={deleting}
            variant="secondary"
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </Screen>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    flex: 1,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stateText: {
    color: palette.mutedText,
    fontSize: 15,
  },
  actionColumn: {
    gap: 12,
  },
  errorText: {
    color: palette.danger,
    fontSize: 15,
    lineHeight: 22,
  },
});
