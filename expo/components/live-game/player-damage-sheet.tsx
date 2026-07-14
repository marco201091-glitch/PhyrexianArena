import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeckImage } from '@/components/deck/deck-image';
import { Modal } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal-header';
import { colors, radii, spacing } from '@/constants/theme';
import type { LiveGamePlayer } from '@/lib/live-game';

type PlayerDamageSheetProps = {
  player: LiveGamePlayer | null;
  players: LiveGamePlayer[];
  title: string;
  commanderLabel: string;
  infectLabel: string;
  onClose: () => void;
};

export function PlayerDamageSheet({
  player,
  players,
  title,
  commanderLabel,
  infectLabel,
  onClose,
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
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.cardInset, padding: spacing.sm },
  sourceImageWrap: { width: 38, height: 52, borderRadius: radii.sm, overflow: 'hidden' },
  sourceImage: { width: 38, height: 52 },
  sourceCopy: { flex: 1, minWidth: 0 },
  sourceName: { color: colors.foreground, fontSize: 14, fontWeight: '700' },
  commanderName: { color: colors.muted, fontSize: 11, marginTop: 2 },
  damageValue: { minWidth: 40, color: '#bfdbfe', fontSize: 26, fontWeight: '900', textAlign: 'right', fontVariant: ['tabular-nums'] },
});
