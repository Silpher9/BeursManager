import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/shared/components/Card';
import { FairDayToggle } from '@/src/shared/fair-day/FairDayToggle';
import { palette } from '@/src/shared/theme/colors';

type Props = {
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
};

export function FairDayToggleCard({ active, onActivate, onDeactivate }: Props) {
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <Text style={styles.label}>{active ? 'Beursdag actief' : 'Beursdag-modus'}</Text>
          <Text style={styles.hint}>
            {active
              ? 'Beurscontext is actief terwijl je navigeert.'
              : 'Activeer om de beurscontext vast te houden.'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={active ? 'Beursdag uitzetten' : 'Beursdag aanzetten'}
          accessibilityState={{ checked: active }}
          onPress={active ? onDeactivate : onActivate}
          style={({ pressed }) => [pressed && styles.pressed]}>
          <FairDayToggle active={active} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.mutedText,
  },
  pressed: {
    opacity: 0.85,
  },
});
