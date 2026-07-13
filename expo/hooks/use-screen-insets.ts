import { useMemo } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';
import { spacing } from '@/constants/theme';
import { contentPadding, contentWidth } from '@/lib/layout';

type ScreenInsets = {
  horizontal: number;
  contentWidth: number;
  scrollContentStyle: ViewStyle;
};

export function useScreenInsets(extraInset = 0): ScreenInsets {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const horizontal = contentPadding(width);
    return {
      horizontal,
      contentWidth: contentWidth(width, extraInset),
      scrollContentStyle: {
        flexGrow: 1,
        paddingHorizontal: horizontal,
        paddingTop: horizontal,
        paddingBottom: spacing.xxxl,
        gap: spacing.lg,
      },
    };
  }, [extraInset, width]);
}