import { Image } from 'expo-image';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { layout as layoutMetrics, scaleForWidth } from '@/lib/layout';

const logoImage = require('@/assets/logo.png');

type ManaLogoSize = 'sm' | 'md' | 'lg' | 'xl';
type ManaLogoLayout = 'horizontal' | 'stacked';

interface ManaLogoProps {
  size?: ManaLogoSize;
  showText?: boolean;
  layout?: ManaLogoLayout;
  subtitle?: string;
  centered?: boolean;
}

const sizes = {
  sm: { plate: 80, wordmark: 13, gap: 8 },
  md: { plate: 104, wordmark: 17, gap: 10 },
  lg: { plate: 152, wordmark: 22, gap: 12 },
  xl: { plate: 236, wordmark: 27, gap: 12 },
} as const;

export function ManaLogo({
  size = 'md',
  showText = false,
  layout = 'horizontal',
  subtitle,
  centered = false,
}: ManaLogoProps) {
  const { width: screenWidth } = useWindowDimensions();
  const base = sizes[size];
  const stacked = layout === 'stacked';
  const contentWidth = Math.max(0, screenWidth - 40);
  const plate = scaleForWidth(base.plate, contentWidth);
  const gap = scaleForWidth(base.gap, contentWidth, layoutMetrics.compactWidth + 40);

  return (
    <View style={[
      styles.root,
      stacked && styles.rootStacked,
      centered && styles.rootCentered,
      { gap, maxWidth: contentWidth },
    ]}>
      <View
        style={[
          styles.plate,
          {
            width: plate,
            height: plate,
          },
        ]}
      >
        <Image
          source={logoImage}
          style={{
            width: plate,
            height: plate,
          }}
          contentFit="contain"
          alt="Tracker & Analytics"
        />
      </View>

      {showText ? (
        <View style={[styles.textBlock, stacked && styles.textBlockStacked]}>
          <Text
            style={[styles.wordmark, { fontSize: base.wordmark }]}
            maxFontSizeMultiplier={layoutMetrics.maxFontSizeMultiplier}
          >
            {subtitle ?? 'Tracker & Analytics'}
          </Text>
        </View>
      ) : subtitle ? (
        <Text
          style={[styles.wordmark, { fontSize: base.wordmark }]}
          maxFontSizeMultiplier={layoutMetrics.maxFontSizeMultiplier}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rootStacked: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  rootCentered: {
    alignSelf: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  plate: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 0,
  },
  textBlock: {
    gap: 6,
    minWidth: 0,
    maxWidth: '100%',
  },
  textBlockStacked: {
    alignItems: 'center',
  },
  wordmark: {
    color: '#f4f4f5',
    fontFamily: 'Cinzel_700Bold',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
