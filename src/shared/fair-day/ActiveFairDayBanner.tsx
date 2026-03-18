import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFairDayMode } from '@/src/shared/fair-day/FairDayModeProvider';
import { FairDayToggle } from '@/src/shared/fair-day/FairDayToggle';
import { useResponsive } from '@/src/shared/hooks/useResponsive';
import { palette } from '@/src/shared/theme/colors';

export function ActiveFairDayBanner() {
  const { activeFair, deactivateFairDay } = useFairDayMode();
  const pathname = usePathname();
  const { isTablet } = useResponsive();

  if (!activeFair || isTablet) {
    return null;
  }

  const closeFairDay = () => {
    const fairId = activeFair.fairId;

    deactivateFairDay();

    if (pathname === `/fairs/${fairId}/day`) {
      router.replace(`/fairs/${fairId}`);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.kicker}>Beursdag actief</Text>
          <Text style={styles.title}>{activeFair.fairName}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Beursdag uitzetten bovenbalk"
          accessibilityState={{ selected: true }}
          onPress={closeFairDay}
          style={({ pressed }) => [pressed && styles.togglePressed]}>
          <FairDayToggle active />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.text,
    borderBottomWidth: 1,
    borderBottomColor: '#332A21',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#D8C5AB',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFDF9',
  },
  togglePressed: {
    opacity: 0.92,
  },
});
