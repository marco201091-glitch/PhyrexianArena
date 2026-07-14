import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { DeckImage } from '@/components/deck/deck-image';
import { cardArt, colors, shadows } from '@/constants/theme';

type CommanderArtSize = keyof typeof cardArt.sizes;

type CommanderArtProps = {
  uri: string | null | undefined;
  alt: string;
  size?: CommanderArtSize;
  highlighted?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function CommanderArt({
  uri,
  alt,
  size = 'md',
  highlighted = false,
  style,
}: CommanderArtProps) {
  const dimensions = cardArt.sizes[size];

  return (
    <DeckImage
      uri={uri}
      alt={alt}
      style={[
        styles.art,
        dimensions,
        highlighted && styles.highlighted,
        shadows.cardArt,
      ]}
      containerStyle={[
        styles.container,
        dimensions,
        highlighted && styles.highlighted,
        shadows.cardArt,
        style,
      ]}
      fallbackSize={size === 'xs' ? 14 : size === 'sm' ? 18 : 22}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    backgroundColor: colors.surfaceTrack,
  },
  art: {
    borderRadius: 6,
  },
  highlighted: {
    borderColor: colors.primaryMuted,
    borderWidth: 2,
  },
});