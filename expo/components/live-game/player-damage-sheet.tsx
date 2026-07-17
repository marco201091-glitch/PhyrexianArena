import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeckImage } from '@/components/deck/deck-image';
import { Modal } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal-header';
import { HoldPressable } from '@/components/ui/hold-pressable';
import { colors, radii, spacing } from '@/constants/theme';
import type { LiveGamePlayer, PlayerCounter, PlayerEmblem } from '@/lib/live-game';

type PlayerDamageSheetProps = {
  player: LiveGamePlayer | null;
  players: LiveGamePlayer[];
  title: string;
  commanderLabel: string;
  infectLabel: string;
  commanderMode?: boolean;
  onClose: () => void;
  onAdjustCounter?: (counter: PlayerCounter, amount: number) => void;
  onSetEmblem?: (emblem: PlayerEmblem, active: boolean) => void;
};

export function PlayerDamageSheet({
  player,
  players,
  title,
  commanderLabel,
  infectLabel,
  commanderMode = true,
  onClose,
  onAdjustCounter,
  onSetEmblem,
}: PlayerDamageSheetProps) {
  if (!player) return null;
  const sources = players.filter((entry) => entry.participantKey !== player.participantKey);

  return (
    <Modal
      visible
      onClose={onClose}
      scroll={false}
      presentation="dialog"
      maxWidth={520}
    >
      <ModalHeader
        title={player.displayName}
        subtitle={title}
        icon="analytics-outline"
        onClose={onClose}
      />

      <View style={styles.infectRow}>
        <View style={styles.labelRow}>
          <Ionicons name="skull-outline" size={18} color="#d8b4fe" />
          <Text style={styles.label}>{infectLabel}</Text>
        </View>
        <Text style={styles.infectValue}>{player.infect}</Text>
      </View>

      <View style={styles.emblemGrid}>
        {([
          ['monarch', 'Monarca', 'ribbon-outline'],
          ['initiative', 'Iniziativa', 'trail-sign-outline'],
        ] as const).map(([emblem, label, icon]) => (
          <Pressable
            key={emblem}
            onPress={() => onSetEmblem?.(emblem, !player.counters[emblem])}
            style={[styles.emblemCard, player.counters[emblem] && styles.emblemCardActive]}
          >
            <Ionicons name={icon} size={22} color={player.counters[emblem] ? '#fde68a' : colors.muted} />
            <Text style={styles.emblemLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.counterList}>
        {([
          ['energy', 'Energia', 'flash-outline'],
          ['experience', 'Esperienza', 'sparkles-outline'],
          ['commanderTax', 'Commander Tax', 'layers-outline'],
        ] as const).filter(([counter]) => commanderMode || counter !== 'commanderTax').map(([counter, label, icon]) => (
          <View key={counter} style={styles.counterRow}>
            <Ionicons name={icon} size={19} color={colors.primaryMuted} />
            <Text style={styles.counterLabel}>{label}</Text>
            <HoldPressable style={styles.counterButton} onShort={() => onAdjustCounter?.(counter as PlayerCounter, -1)} onLong={() => onAdjustCounter?.(counter as PlayerCounter, -10)}>
              <Ionicons name="remove" size={20} color={colors.foreground} />
            </HoldPressable>
            <Text style={styles.counterValue}>{player.counters[counter]}</Text>
            <HoldPressable style={styles.counterButton} onShort={() => onAdjustCounter?.(counter as PlayerCounter, 1)} onLong={() => onAdjustCounter?.(counter as PlayerCounter, 10)}>
              <Ionicons name="add" size={20} color={colors.foreground} />
            </HoldPressable>
          </View>
        ))}
      </View>

      {commanderMode ? <>
      <Text style={styles.sectionLabel}>{commanderLabel}</Text>
      <View style={styles.sourceList}>
        {sources.map((source) => (
          <View key={source.participantKey} style={styles.sourceRow}>
            <DeckImage
              uri={source.commanderImage}
              alt={source.commander}
              style={styles.sourceImage}
              containerStyle={styles.sourceImageWrap}
              contentPosition="top"
            />
            <View style={styles.sourceCopy}>
              <Text style={styles.sourceName} numberOfLines={1}>{source.displayName}</Text>
              <Text style={styles.commanderName} numberOfLines={1}>{source.commander}</Text>
            </View>
            <Text style={styles.damageValue}>{player.commanderDamageFrom[source.participantKey] ?? 0}</Text>
          </View>
        ))}
      </View>
      </> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  infectRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: radii.md, backgroundColor: 'rgba(107,33,168,0.16)',
    borderWidth: 1, borderColor: 'rgba(216,180,254,0.2)', padding: spacing.md,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { color: colors.foreground, fontSize: 14, fontWeight: '700' },
  infectValue: { color: '#e9d5ff', fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  sourceList: { gap: spacing.xs },
  emblemGrid: { flexDirection: 'row', gap: spacing.sm },
  emblemCard: { flex: 1, minHeight: 82, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardInset, alignItems: 'center', justifyContent: 'center', gap: 7 },
  emblemCardActive: { borderColor: 'rgba(253,230,138,0.65)', backgroundColor: 'rgba(161,98,7,0.22)' },
  emblemLabel: { color: colors.foreground, fontSize: 13, fontWeight: '800' },
  counterList: { gap: spacing.xs },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.cardInset, padding: spacing.sm },
  counterLabel: { flex: 1, color: colors.foreground, fontSize: 13, fontWeight: '700' },
  counterButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  counterValue: { width: 34, color: colors.foreground, fontSize: 20, fontWeight: '900', textAlign: 'center', fontVariant: ['tabular-nums'] },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.cardInset, padding: spacing.sm },
  sourceImageWrap: { width: 38, height: 52, borderRadius: radii.sm, overflow: 'hidden' },
  sourceImage: { width: 38, height: 52 },
  sourceCopy: { flex: 1, minWidth: 0 },
  sourceName: { color: colors.foreground, fontSize: 14, fontWeight: '700' },
  commanderName: { color: colors.muted, fontSize: 11, marginTop: 2 },
  damageValue: { minWidth: 40, color: '#bfdbfe', fontSize: 26, fontWeight: '900', textAlign: 'right', fontVariant: ['tabular-nums'] },
});
