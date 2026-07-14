import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { colors } from '@/constants/theme';

type DamageDragOverlayProps = {
  visible: boolean;
  amount: number | string;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  sourceX: SharedValue<number>;
  sourceY: SharedValue<number>;
};

function EnergyParticle({
  progress,
  size,
  bend,
  dragX,
  dragY,
  sourceX,
  sourceY,
}: {
  progress: number;
  size: number;
  bend: number;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  sourceX: SharedValue<number>;
  sourceY: SharedValue<number>;
}) {
  const particleStyle = useAnimatedStyle(() => {
    const dx = dragX.value - sourceX.value;
    const dy = dragY.value - sourceY.value;
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const arc = Math.sin(Math.PI * progress) * bend;
    return {
      opacity: 0.38 + progress * 0.62,
      transform: [
        { translateX: sourceX.value + dx * progress + normalX * arc - size / 2 },
        { translateY: sourceY.value + dy * progress + normalY * arc - size / 2 },
        { scale: 0.72 + progress * 0.55 },
      ],
    };
  });

  return <Animated.View style={[styles.particle, { width: size, height: size, borderRadius: size / 2 }, particleStyle]} />;
}

export function DamageDragOverlay({ visible, amount, dragX, dragY, sourceX, sourceY }: DamageDragOverlayProps) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value - 30 },
      { translateY: dragY.value - 30 },
    ],
  }));
  if (!visible) return null;

  return (
    <View style={styles.layer} pointerEvents="none">
      <EnergyParticle progress={0.04} size={15} bend={0} {...{ dragX, dragY, sourceX, sourceY }} />
      <EnergyParticle progress={0.16} size={7} bend={-9} {...{ dragX, dragY, sourceX, sourceY }} />
      <EnergyParticle progress={0.31} size={10} bend={13} {...{ dragX, dragY, sourceX, sourceY }} />
      <EnergyParticle progress={0.48} size={6} bend={-17} {...{ dragX, dragY, sourceX, sourceY }} />
      <EnergyParticle progress={0.64} size={12} bend={12} {...{ dragX, dragY, sourceX, sourceY }} />
      <EnergyParticle progress={0.79} size={8} bend={-8} {...{ dragX, dragY, sourceX, sourceY }} />
      <EnergyParticle progress={0.9} size={14} bend={6} {...{ dragX, dragY, sourceX, sourceY }} />
      <Animated.View style={[styles.orb, style]}>
        <View style={styles.orbOuterRing} />
        <View style={styles.orbInnerRing} />
        <Ionicons name="flash" size={17} color="#fff7ed" />
        <Text style={styles.orbText}>{amount}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  orb: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(185, 28, 28, 0.95)',
    borderWidth: 2,
    borderColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  particle: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fca5a5',
    shadowColor: '#ef4444',
    shadowOpacity: 0.95,
    shadowRadius: 7,
    elevation: 12,
  },
  orbOuterRing: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    borderColor: 'rgba(248,113,113,0.42)',
  },
  orbInnerRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  orbText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
