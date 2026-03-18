import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog.
 * Uses window.confirm on web (Alert.alert is a no-op in RNW 0.21+),
 * and Alert.alert on native.
 */
export function confirmAction(
  title: string,
  message: string,
  destructiveLabel: string,
  onConfirm: () => void
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Annuleren', style: 'cancel' },
    { text: destructiveLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
