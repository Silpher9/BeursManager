import { palette } from '@/src/shared/theme/colors';

/**
 * Shared screenOptions for all Stack navigators in tab sections.
 *
 * headerLeftContainerStyle / headerRightContainerStyle are from
 * @react-navigation/elements Header component — applied on web,
 * silently ignored on native.
 */
export const stackScreenOptions = {
  headerStyle: { backgroundColor: palette.background },
  headerShadowVisible: false,
  headerTintColor: palette.text,
  contentStyle: { backgroundColor: palette.background },
  headerLeftContainerStyle: { paddingLeft: 20 },
  headerRightContainerStyle: { paddingRight: 20 },
} as const;
