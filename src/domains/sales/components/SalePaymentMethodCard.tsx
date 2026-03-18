import { StyleSheet, Text, View } from 'react-native';

import {
  paymentMethodLabels,
  paymentMethods,
  type PaymentMethod,
} from '@/src/domains/sales/types';
import { Card } from '@/src/shared/components/Card';
import { ChoiceChip } from '@/src/shared/components/ChoiceChip';
import { palette } from '@/src/shared/theme/colors';

type SalePaymentMethodCardProps = {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  hintText?: string;
  secondaryHintText?: string | null;
};

export function SalePaymentMethodCard({
  value,
  onChange,
  hintText,
  secondaryHintText,
}: SalePaymentMethodCardProps) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Betaalmethode</Text>
      <View style={styles.choiceRow}>
        {paymentMethods.map((method) => (
          <ChoiceChip
            key={method}
            label={paymentMethodLabels[method]}
            active={value === method}
            onPress={() => onChange(method)}
          />
        ))}
      </View>
      {hintText ? <Text style={styles.hintText}>{hintText}</Text> : null}
      {secondaryHintText ? <Text style={styles.hintText}>{secondaryHintText}</Text> : null}
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
  hintText: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.mutedText,
  },
});
