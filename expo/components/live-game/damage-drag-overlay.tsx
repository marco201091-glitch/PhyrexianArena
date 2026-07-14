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

function DamageArrowShaft({
  dragX,
  dragY,
  sourceX,
  sourceY,
}: Pick<DamageDragOverlayProps, 'dragX' | 'dragY' | 'sourceX' | 'sourceY'>) {
  const shaftStyle = useAnimatedStyle(() => {
    const dx = dragX.value - sourceX.value;
    const dy = dragY.value - sourceY.value;
    const length = Math.max(1, Math.sqrt(dx * dx + dy * dy) - 22);
    const angle = Math.atan2(dy, dx);
    const centerX = sourceX.value + Math.cos(angle) * length / 2;
    const centerY = sourceY.value + Math.sin(angle) * length / 2;
    return {
      width: length,
      left: centerX - length / 2,
      top: centerY - 6,
      opacity: Math.min(1, length / 70),
      transform: [{ rotate: `${angle}rad` }],
    };
  });

  return (
    <Animated.View style={[styles.arrowShaft, shaftStyle]}>
      <View style={styles.arrowGlow} />
      <View style={styles.arrowCore} />
      <View style={styles.arrowSpark} />
    </Animated.View>
  );
}

export function DamageDragOverlay({ visible, amount, dragX, dragY, sourceX, sourceY }: DamageDragOverlayProps) {
  const arrowHeadStyle = useAnimatedStyle(() => {
    const dx = dragX.value - sourceX.value;
    const dy = dragY.value - sourceY.value;
    const angle = Math.atan2(dy, dx);
    return {
      left: dragX.value - 27,
      top: dragY.value - 27,
      transform: [{ rotate: `${angle}rad` }],
    };
  });
  const amountStyle = useAnimatedStyle(() => ({
    left: dragX.value + 12,
    top: dragY.value + 12,
  }));
  if (!visible) return null;

  return (
    <View style={styles.layer} pointerEvents="none">
      <DamageArrowShaft {...{ dragX, dragY, sourceX, sourceY }} />
      <EnergyParticle progress={0.04} size={15} bend={0} {...{ dragX, dragY, sourceX, sourceY }} />
      <EnergyParticle progress={0.16} size={7} bend={-9} {...{ dragX, dragY, sourceX, sourceY }} />
      <EnergyParticle progress={0.31} size={10} bend={13} {...{ dragX, dragY, sourceX, sourceY }} />
      <EnergyParticle progress={0.48} size={6} bend={-17} {...{ dragX, dragY, sourceX, sourceY }} />
      <EnergyParticle progress={0.64} size={12} bend={12} {...{ dragX, dragY, sourceX, sourceY }} />
      <EnergyParticle progress={0.79} size={8} bend={-8} {...{ dragX, dragY, sourceX, sourceY }} />
      <EnergyParticle progress={0.9} size={14} bend={6} {...{ dragX, dragY, sourceX, sourceY }} />
      <Animated.View style={[styles.arrowHead, arrowHeadStyle]}>
        <View style={styles.arrowHeadRing} />
        <Ionicons name="arrow-forward" size={37} color="#fff7ed" />
      </Animated.View>
      <Animated.View style={[styles.amountBadge, amountStyle]}>
        <Text style={styles.amountText}>{amount}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  arrowShaft: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 12,
    justifyContent: 'center',
  },
  arrowGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 6,
    backgroundColor: 'rgba(239,68,68,0.3)',
    shadowColor: '#ef4444',
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  arrowCore: {
    height: 5,
    marginHorizontal: 5,
    borderRadius: 3,
    backgroundColor: '#fff7ed',
  },
  arrowSpark: {
    position: 'absolute',
    right: 4,
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fca5a5',
  },
  arrowHead: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
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
  arrowHeadRing: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: 'rgba(248,113,113,0.42)',
  },
  amountBadge: {
    position: 'absolute',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#fff7ed',
    backgroundColor: '#7f1d1d',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  amountText: {
    color: colors.foreground,
    fontSize: 11,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});
