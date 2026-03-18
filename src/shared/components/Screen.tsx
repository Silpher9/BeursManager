import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useResponsive } from '@/src/shared/hooks/useResponsive';
import { palette } from '@/src/shared/theme/colors';

type Props = {
  children: ReactNode;
  scroll?: boolean;
};

export function Screen({ children, scroll = false }: Props) {
  const { contentMaxWidth, contentPaddingHorizontal, contentPaddingVertical } = useResponsive();

  const dynamicStyle = {
    paddingHorizontal: contentPaddingHorizontal,
    paddingVertical: contentPaddingVertical,
    maxWidth: contentMaxWidth,
    width: '100%' as const,
    alignSelf: 'center' as const,
  };

  if (scroll) {
    return (
      <ScrollView
        style={styles.scrollOuter}
        contentContainerStyle={[styles.content, dynamicStyle]}>
        {children}
      </ScrollView>
    );
  }

  return <View style={[styles.content, dynamicStyle]}>{children}</View>;
}

const styles = StyleSheet.create({
  scrollOuter: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flexGrow: 1,
    backgroundColor: palette.background,
    gap: 16,
  },
});
