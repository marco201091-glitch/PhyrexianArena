import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';
import { useCachedRemoteImage } from '@/hooks/use-cached-remote-image';

const SIZES = {
  sm: 40,
  md: 72,
} as const;

type ProfileAvatarSize = keyof typeof SIZES;

type ProfileAvatarProps = {
  uri: string | null;
  size?: ProfileAvatarSize;
  style?: StyleProp<ViewStyle>;
};

export function ProfileAvatar({ uri, size = 'sm', style }: ProfileAvatarProps) {
  const dimension = SIZES[size];
  const radius = dimension / 2;
  const iconSize = size === 'sm' ? 22 : 36;
  const { resolvedUri, loading, failed, handleError } = useCachedRemoteImage(uri);
  const showImage = Boolean(resolvedUri) && !failed;

  return (
    <View
      style={[
        styles.frame,
        {
          width: dimension,
          height: dimension,
          borderRadius: radius,
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: resolvedUri as string }}
          style={{ width: dimension, height: dimension, borderRadius: radius }}
          contentFit="cover"
          cachePolicy={resolvedUri?.startsWith('file://') ? 'memory' : 'memory-disk'}
          alt=""
          onError={handleError}
        />
      ) : loading ? (
        <View style={[styles.placeholder, { width: dimension, height: dimension, borderRadius: radius }]}>
          <ActivityIndicator size="small" color={colors.primaryMuted} />
        </View>
      ) : (
        <View style={[styles.placeholder, { width: dimension, height: dimension, borderRadius: radius }]}>
          <Ionicons name="person" size={iconSize} color={colors.muted} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 2,
    borderColor: colors.borderViolet,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
});
