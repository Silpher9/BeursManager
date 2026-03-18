import { Pressable, StyleSheet, Text } from 'react-native';

import { palette } from '@/src/shared/theme/colors';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  compact?: boolean;
  stretch?: boolean;
  variant?: 'primary' | 'secondary';
};

export function AppButton({
  label,
  onPress,
  disabled = false,
  compact = false,
  stretch = false,
  variant = 'primary',
}: Props) {
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : styles.regular,
        primary ? styles.primary : styles.secondary,
        stretch ? styles.stretch : null,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}>
      <Text
        pointerEvents="none"
        style={[styles.label, primary ? styles.primaryLabel : styles.secondaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
  },
  regular: {
    minHeight: 54,
    paddingHorizontal: 18,
  },
  compact: {
    minHeight: 38,
    paddingHorizontal: 14,
  },
  primary: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  secondary: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
  },
  stretch: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryLabel: {
    color: '#FFFDF9',
  },
  secondaryLabel: {
    color: palette.text,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
});
