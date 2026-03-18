import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLargeScreen = width >= 1024;

  const contentPadding = isTablet ? 32 : 20;

  return {
    isTablet,
    isLargeScreen,
    contentMaxWidth: isTablet ? 1200 : 9999,
    contentPadding,
    contentPaddingHorizontal: contentPadding,
    contentPaddingVertical: isTablet ? 16 : 20,
    windowWidth: width,
    windowHeight: height,
  };
}
