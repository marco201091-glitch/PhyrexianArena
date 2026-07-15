import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii } from '@/constants/theme';
import { useReducedMotion } from '@/lib/reduced-motion';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radii.sm,
  style,
}: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(0.35));
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(0.55);
      return undefined;
    }

    opacity.setValue(0.35);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.75, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={120} borderRadius={radii.md} />
      <Skeleton height={18} width="70%" />
      <Skeleton height={14} width="45%" />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.border,
  },
  card: {
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 16,
  },
});
