import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { getDeckMastery, getDeckMasteryLabel } from '@/lib/deck-mastery';
import type { AppLanguage } from '@/lib/i18n/types';

const SIZE = 62;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DeckMasteryBadge({
  gamesPlayed = 0,
  wins = 0,
  language,
}: {
  gamesPlayed?: number;
  wins?: number;
  language: AppLanguage;
}) {
  const mastery = getDeckMastery(gamesPlayed, wins);
  const label = getDeckMasteryLabel(mastery.tier, language);
  const progressLabel = mastery.complete
    ? `${mastery.points} pt`
    : `${mastery.points}/${mastery.nextTarget} pt`;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`${label}, ${progressLabel}`}
    >
      <View style={styles.ring}>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="rgba(255,255,255,0.16)"
            strokeWidth={STROKE}
            fill="rgba(0,0,0,0.74)"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={mastery.color}
            strokeWidth={STROKE}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={CIRCUMFERENCE * (1 - mastery.progress)}
            rotation="-90"
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        <Text style={styles.points}>{mastery.points}</Text>
        <Text style={styles.pointsLabel}>PT</Text>
      </View>
      <View>
        <Text style={[styles.tier, { color: mastery.color }]}>{label}</Text>
        <Text style={styles.progress}>{progressLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ring: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  points: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900',
  },
  pointsLabel: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tier: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progress: {
    marginTop: 1,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 10,
  },
});
