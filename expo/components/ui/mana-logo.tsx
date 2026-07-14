import { Image } from 'expo-image';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { layout as layoutMetrics, scaleForWidth } from '@/lib/layout';

const logoImage = require('@/assets/logo.png');
const wordmarkImage = require('@/assets/logo-wordmark.png');

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
  sm: { plate: 80, logo: 64, wordmarkH: 36, wordmarkW: 112, subtitle: 10, gap: 8 },
  md: { plate: 104, logo: 84, wordmarkH: 48, wordmarkW: 176, subtitle: 11, gap: 10 },
  lg: { plate: 152, logo: 124, wordmarkH: 64, wordmarkW: 256, subtitle: 11, gap: 12 },
  xl: { plate: 236, logo: 196, wordmarkH: 80, wordmarkW: 320, subtitle: 10, gap: 12 },
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
  const wordmarkW = Math.min(scaleForWidth(base.wordmarkW, contentWidth), contentWidth);
  const wordmarkH = scaleForWidth(base.wordmarkH, contentWidth);
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
          alt="Phyrexian Arena"
        />
      </View>

      {showText ? (
        <View style={[styles.textBlock, stacked && styles.textBlockStacked]}>
          <Image
            source={wordmarkImage}
            style={{
              width: stacked ? wordmarkW : wordmarkW,
              height: wordmarkH,
              maxWidth: '100%',
            }}
            contentFit="contain"
            alt="Phyrexian Arena"
          />
          {subtitle ? (
            <Text
              style={[styles.subtitle, { fontSize: base.subtitle }]}
              maxFontSizeMultiplier={layoutMetrics.maxFontSizeMultiplier}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : subtitle ? (
        <Text
          style={[styles.subtitle, { fontSize: base.subtitle }]}
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
  subtitle: {
    color: 'rgba(244, 244, 245, 0.8)',
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});