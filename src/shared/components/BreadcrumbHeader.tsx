import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/src/shared/theme/colors';

type BreadcrumbSegment = {
  label: string;
  onPress?: () => void;
};

type BreadcrumbHeaderProps = {
  breadcrumbs: BreadcrumbSegment[];
  screenTitle?: string;
  action: {
    label: string;
    onPress: () => void;
  };
};

export function BreadcrumbHeader({
  breadcrumbs,
  screenTitle,
  action,
}: BreadcrumbHeaderProps) {
  const actionButton = (
    <Pressable
      accessibilityRole="button"
      onPress={action.onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
      <Text style={styles.actionText}>{action.label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.breadcrumbRow}>
        {breadcrumbs.map((segment, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <Fragment key={`${segment.label}-${index}`}>
              {segment.onPress ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={segment.onPress}
                  style={({ pressed }) => [styles.breadcrumbPressable, pressed && styles.pressed]}>
                  <Text style={styles.breadcrumbLink}>{segment.label}</Text>
                </Pressable>
              ) : (
                <Text style={isLast ? styles.breadcrumbCurrent : styles.breadcrumbText}>
                  {segment.label}
                </Text>
              )}
              {!isLast ? <Text style={styles.separator}>›</Text> : null}
            </Fragment>
          );
        })}
        {!screenTitle ? <View style={styles.breadcrumbSpacer} /> : null}
        {!screenTitle ? actionButton : null}
      </View>

      {screenTitle ? (
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>
            {screenTitle}
          </Text>
          {actionButton}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: 4,
    columnGap: 6,
  },
  breadcrumbPressable: {
    borderRadius: 999,
  },
  breadcrumbText: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.mutedText,
  },
  breadcrumbLink: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.accent,
    fontWeight: '600',
  },
  breadcrumbCurrent: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.mutedText,
  },
  breadcrumbSpacer: {
    flex: 1,
  },
  separator: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.mutedText,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  actionButton: {
    borderRadius: 999,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
