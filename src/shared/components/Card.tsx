import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { palette } from '@/src/shared/theme/colors';

type Props = {
  children: ReactNode;
};

export function Card({ children }: Props) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    gap: 12,
  },
});
