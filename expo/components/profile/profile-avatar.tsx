import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';

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
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(uri) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

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
          source={{ uri: uri as string }}
          style={{ width: dimension, height: dimension, borderRadius: radius }}
          contentFit="cover"
          alt=""
          onError={() => setImageFailed(true)}
        />
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