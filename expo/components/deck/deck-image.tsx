import { Image, type ImageContentFit, type ImageContentPosition } from 'expo-image';
import { ActivityIndicator, StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';
import { useDeckImageUri } from '@/hooks/use-deck-image-uri';
import { getRemoteImageHeaders } from '@/lib/remote-image';

type DeckImageProps = {
  uri: string | null | undefined;
  alt: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  fallbackSize?: number;
  showLoader?: boolean;
  contentFit?: ImageContentFit;
  contentPosition?: ImageContentPosition;
};

export function DeckImage({
  uri,
  alt,
  style,
  containerStyle,
  fallbackSize = 20,
  showLoader = false,
  contentFit = 'cover',
  contentPosition,
}: DeckImageProps) {
  const { resolvedUri, loading, failed, handleError } = useDeckImageUri(uri, alt);

  if (loading) {
    return (
      <View style={[styles.fallback, containerStyle]}>
        {showLoader ? <ActivityIndicator size="small" color={colors.primaryMuted} /> : null}
      </View>
    );
  }

  if (!resolvedUri || failed) {
    return (
      <View style={[styles.fallback, containerStyle]}>
        <Text style={[styles.fallbackIcon, { fontSize: fallbackSize }]}>⚔</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: resolvedUri, headers: getRemoteImageHeaders(resolvedUri) }}
      alt={alt}
      style={style}
      contentFit={contentFit}
      contentPosition={contentPosition}
      cachePolicy={resolvedUri.startsWith('file://') ? 'memory' : 'memory-disk'}
      transition={180}
      recyclingKey={`${alt}::${resolvedUri ?? ''}`}
      onError={handleError}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.surfaceTrack,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  fallbackIcon: {
    color: colors.muted,
  },
});
