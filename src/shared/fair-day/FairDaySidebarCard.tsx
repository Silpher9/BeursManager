import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FairDayToggle } from '@/src/shared/fair-day/FairDayToggle';

const ACTIVE_TINT = '#FFFDF9';
const INACTIVE_TINT = '#D8C5AB';

type Props = {
  fairName: string;
  onOpenOverview: () => void;
  onDeactivate: () => void;
};

export function FairDaySidebarCard({ fairName, onOpenOverview, onDeactivate }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>Beursdag actief</Text>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Beursdag uitzetten sidebar"
          accessibilityState={{ checked: true }}
          onPress={onDeactivate}
          style={({ pressed }) => [pressed && styles.pressed]}>
          <FairDayToggle active />
        </Pressable>
      </View>
      <Text style={styles.fairName} numberOfLines={2}>{fairName}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Beursdag overzicht"
        onPress={onOpenOverview}
        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
        <Text style={styles.actionLabel}>Overzicht</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(138, 106, 69, 0.15)',
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: INACTIVE_TINT,
  },
  fairName: {
    fontSize: 14,
    fontWeight: '700',
    color: ACTIVE_TINT,
    lineHeight: 18,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 253, 249, 0.12)',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 2,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: ACTIVE_TINT,
  },
  pressed: {
    opacity: 0.85,
  },
});
