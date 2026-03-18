import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/shared/components/Card';
import { formatPrice } from '@/src/shared/formatters';
import { palette } from '@/src/shared/theme/colors';

type FairMetricsCardProps = {
  assignedCount: number;
  salesCount: number;
  salesTotal: number;
  expensesTotal: number;
  fairResult: number;
};

export function FairMetricsCard({
  assignedCount,
  salesCount,
  salesTotal,
  expensesTotal,
  fairResult,
}: FairMetricsCardProps) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Beursstatus</Text>
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{assignedCount}</Text>
          <Text style={styles.metricLabel}>werken gekoppeld</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{salesCount}</Text>
          <Text style={styles.metricLabel}>verkopen</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{formatPrice(salesTotal, 'EUR 0')}</Text>
          <Text style={styles.metricLabel}>omzet</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{formatPrice(expensesTotal, 'EUR 0')}</Text>
          <Text style={styles.metricLabel}>kosten</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{formatPrice(fairResult, 'EUR 0')}</Text>
          <Text style={styles.metricLabel}>resultaat</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
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
});
