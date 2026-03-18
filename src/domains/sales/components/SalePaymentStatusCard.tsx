import { StyleSheet, Text, View } from 'react-native';

import {
  paymentStatusLabels,
  paymentStatuses,
  type PaymentStatus,
} from '@/src/domains/sales/types';
import { Card } from '@/src/shared/components/Card';
import { ChoiceChip } from '@/src/shared/components/ChoiceChip';
import { palette } from '@/src/shared/theme/colors';

type SalePaymentStatusCardProps = {
  value: PaymentStatus;
  onChange: (value: PaymentStatus) => void;
};

export function SalePaymentStatusCard({ value, onChange }: SalePaymentStatusCardProps) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Betaalstatus</Text>
      <View style={styles.choiceRow}>
        {paymentStatuses.map((status) => (
          <ChoiceChip
            key={status}
            label={paymentStatusLabels[status]}
            active={value === status}
            onPress={() => onChange(status)}
          />
        ))}
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
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
