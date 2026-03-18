import { StyleSheet, View } from 'react-native';

import { palette } from '@/src/shared/theme/colors';

type Props = {
  active: boolean;
};

export function FairDayToggle({ active }: Props) {
  return (
    <View style={[styles.track, active ? styles.trackActive : styles.trackInactive]}>
      <View
        pointerEvents="none"
        style={[styles.thumb, active ? styles.thumbActive : styles.thumbInactive]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 999,
    padding: 2,
    justifyContent: 'center',
  },
  trackActive: {
    backgroundColor: palette.accent,
  },
  trackInactive: {
    backgroundColor: palette.border,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: palette.surface,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
    elevation: 1,
  },
  thumbActive: {
    alignSelf: 'flex-end',
  },
  thumbInactive: {
    alignSelf: 'flex-start',
  },
});
