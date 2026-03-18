import { StyleSheet, Text } from 'react-native';

import { formatFairDateRange } from '@/src/domains/fairs/formatters';
import { type Fair } from '@/src/domains/fairs/types';
import { Card } from '@/src/shared/components/Card';
import { palette } from '@/src/shared/theme/colors';

export function FairHeaderCard({ fair }: { fair: Fair }) {
  return (
    <Card>
      <Text style={styles.kicker}>Beursdetail</Text>
      <Text style={styles.title}>{fair.name}</Text>
      <Text style={styles.metaText}>{fair.location || 'Locatie nog leeg'}</Text>
      <Text style={styles.metaText}>{formatFairDateRange(fair.startDate, fair.endDate)}</Text>
      {fair.notes ? <Text style={styles.notes}>{fair.notes}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
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
  metaText: {
    fontSize: 15,
    lineHeight: 24,
    color: palette.mutedText,
  },
  notes: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 24,
    color: palette.text,
  },
});
