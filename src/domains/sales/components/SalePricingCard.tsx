import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/shared/components/Card';
import { Field } from '@/src/shared/components/Field';
import { formatPrice } from '@/src/shared/formatters';
import { palette } from '@/src/shared/theme/colors';

type SalePricingCardProps = {
  askingPrice: string;
  discount: string;
  salePrice: number;
  summaryLabel: string;
  onChangeAskingPrice: (value: string) => void;
  onChangeDiscount: (value: string) => void;
};

export function SalePricingCard({
  askingPrice,
  discount,
  salePrice,
  summaryLabel,
  onChangeAskingPrice,
  onChangeDiscount,
}: SalePricingCardProps) {
  return (
    <Card>
      <Field
        label="Originele vraagprijs"
        placeholder="1250"
        keyboardType="decimal-pad"
        value={askingPrice}
        onChangeText={onChangeAskingPrice}
      />
      <Field
        label="Korting"
        placeholder="0"
        keyboardType="decimal-pad"
        value={discount}
        onChangeText={onChangeDiscount}
      />
      <View style={styles.summaryStrip}>
        <Text style={styles.summaryLabel}>{summaryLabel}</Text>
        <Text style={styles.summaryValue}>{formatPrice(salePrice, 'EUR 0')}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  summaryStrip: {
    marginTop: 4,
    borderRadius: 18,
    backgroundColor: palette.softAccent,
    padding: 14,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
  },
});
