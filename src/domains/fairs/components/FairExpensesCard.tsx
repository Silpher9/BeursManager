import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { expenseCategoryLabels, type ExpenseListItem } from '@/src/domains/expenses/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { Card } from '@/src/shared/components/Card';
import { formatPrice } from '@/src/shared/formatters';
import { palette } from '@/src/shared/theme/colors';

import { formatActivityTimestamp } from './formatActivityTimestamp';

export function FairExpensesCard({
  fairId,
  expenses,
}: {
  fairId: string;
  expenses: ExpenseListItem[];
}) {
  return (
    <Card>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.sectionTitle}>Kosten</Text>
          <Text style={styles.sectionHint}>
            Leg standhuur, reizen en andere beurskosten direct vast op deze beurs.
          </Text>
        </View>
        <Link href={`/fairs/${fairId}/expenses/new`} asChild>
          <AppButton label="Nieuwe kostenpost" compact />
        </Link>
      </View>
      {expenses.length === 0 ? (
        <Text style={styles.emptyText}>Nog geen kosten geregistreerd.</Text>
      ) : (
        <View style={styles.expenseList}>
          {expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseRow}>
              <View style={styles.expenseContent}>
                <Text style={styles.expenseTitle}>{expenseCategoryLabels[expense.category]}</Text>
                <Text style={styles.expenseMeta}>
                  {formatPrice(expense.amount, 'EUR 0')} · {formatActivityTimestamp(expense.createdAt)}
                </Text>
                {expense.description ? (
                  <Text style={styles.expenseMeta}>{expense.description}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardHeaderText: {
    flex: 1,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  sectionHint: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.mutedText,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.mutedText,
  },
  expenseList: {
    gap: 10,
  },
  expenseRow: {
    borderRadius: 16,
    backgroundColor: '#FCFAF6',
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
  },
  expenseContent: {
    gap: 4,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
  },
  expenseMeta: {
    fontSize: 13,
    color: palette.mutedText,
  },
});
