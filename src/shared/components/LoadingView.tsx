import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/src/shared/theme/colors';

type Props = {
  label?: string;
};

export function LoadingView({ label = 'Laden...' }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={palette.accent} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: palette.background,
  },
  label: {
    color: palette.mutedText,
    fontSize: 15,
  },
});
