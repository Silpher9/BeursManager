import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/src/shared/theme/colors';

type Props = {
  title: string;
  action?: ReactNode;
};

export function ScreenHeader({ title, action }: Props) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {action ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.text,
  },
});
