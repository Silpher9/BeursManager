import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { router, usePathname } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { StandEditorSidebar } from '@/src/domains/stand/StandEditorSidebar';
import { useFairDayMode } from '@/src/shared/fair-day/FairDayModeProvider';
import { FairDaySidebarCard } from '@/src/shared/fair-day/FairDaySidebarCard';
import { palette } from '@/src/shared/theme/colors';

const SIDEBAR_BG = '#3A2E22';
const ACTIVE_TINT = '#FFFDF9';
const INACTIVE_TINT = '#D8C5AB';
const ACTIVE_ITEM_BG = 'rgba(255, 253, 249, 0.12)';

export function FloatingSidebar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { activeFair, deactivateFairDay } = useFairDayMode();
  const pathname = usePathname();

  const activeRoute = state.routes[state.index];
  const isStandActive = activeRoute?.name === 'stand';

  const closeFairDay = () => {
    const fairId = activeFair?.fairId;
    deactivateFairDay();
    if (pathname === `/fairs/${fairId}/day`) {
      router.replace(`/fairs/${fairId}`);
    }
  };

  const navigateToHome = () => {
    const homeRoute = state.routes.find(r => r.name === 'index');
    if (homeRoute) {
      navigation.dispatch({
        ...CommonActions.navigate(homeRoute),
        target: state.key,
      });
    }
  };

  return (
    <View
      style={[
        styles.outerWrapper,
        {
          paddingTop: Math.max(16, insets.top + 8),
          paddingBottom: Math.max(16, insets.bottom + 8),
          paddingLeft: Math.max(16, insets.left + 8),
        },
      ]}
    >
      <View style={styles.floatingCard}>
        {isStandActive ? (
          <StandEditorSidebar onBack={navigateToHome} />
        ) : (
          <>
            <Image
              source={require('@/assets/images/logo-monogram.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.separator} />

            {activeFair && (
              <>
                <FairDaySidebarCard
                  fairName={activeFair.fairName}
                  onOpenOverview={() => router.push(`/fairs/${activeFair.fairId}/day`)}
                  onDeactivate={closeFairDay}
                />
                <View style={styles.separator} />
              </>
            )}

            <View style={styles.itemsContainer}>
              {state.routes.map((route, index) => {
                if (route.name === 'stand') return null;

                const { options } = descriptors[route.key];
                const isFocused = state.index === index;
                const tintColor = isFocused ? ACTIVE_TINT : INACTIVE_TINT;

                const onPress = () => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    navigation.dispatch({
                      ...CommonActions.navigate(route),
                      target: state.key,
                    });
                  }
                };

                return (
                  <Pressable
                    key={route.key}
                    onPress={onPress}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isFocused }}
                    aria-selected={isFocused}
                    accessibilityLabel={options.tabBarAccessibilityLabel}
                    style={[styles.tabItem, isFocused && styles.tabItemActive]}
                  >
                    {options.tabBarIcon?.({
                      focused: isFocused,
                      color: tintColor,
                      size: 22,
                    })}
                    <Text
                      style={[styles.tabLabel, { color: tintColor }, isFocused && styles.tabLabelActive]}
                      numberOfLines={1}
                    >
                      {options.title ?? route.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Stand tab — visueel gescheiden onderaan */}
            {state.routes.map((route, index) => {
              if (route.name !== 'stand') return null;

              const { options } = descriptors[route.key];
              const isFocused = state.index === index;
              const tintColor = isFocused ? ACTIVE_TINT : INACTIVE_TINT;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.dispatch({
                    ...CommonActions.navigate(route),
                    target: state.key,
                  });
                }
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isFocused }}
                  aria-selected={isFocused}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  style={[styles.standItem, isFocused && styles.standItemActive]}
                >
                  {options.tabBarIcon?.({
                    focused: isFocused,
                    color: tintColor,
                    size: 36,
                  })}
                  <Text
                    style={[styles.standLabel, { color: tintColor }, isFocused && styles.tabLabelActive]}
                    numberOfLines={1}
                  >
                    {options.title ?? route.name}
                  </Text>
                </Pressable>
              );
            })}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    backgroundColor: palette.background,
  },
  floatingCard: {
    flex: 1,
    width: 200,
    backgroundColor: SIDEBAR_BG,
    borderRadius: 20,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 12,
    boxShadow: '2px 4px 12px rgba(0, 0, 0, 0.18)',
    elevation: 8,
  },
  logo: {
    width: 140,
    height: 100,
    alignSelf: 'center',
    marginBottom: 12,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 253, 249, 0.1)',
    marginHorizontal: 4,
    marginBottom: 12,
  },
  itemsContainer: {
    flex: 1,
    gap: 4,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  tabItemActive: {
    backgroundColor: ACTIVE_ITEM_BG,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  standItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 253, 249, 0.1)',
    marginTop: 8,
    gap: 6,
  },
  standItemActive: {
    backgroundColor: ACTIVE_ITEM_BG,
  },
  standLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
