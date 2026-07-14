import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeckImage } from '@/components/deck/deck-image';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal-header';
import { colors, radii, spacing } from '@/constants/theme';
import type { DamageMode, LiveGamePlayer } from '@/lib/live-game';

const QUICK_AMOUNTS = [1, 2, 3, 5, 10, 15] as const;

type DamageConfirmSheetProps = {
  visible: boolean;
  source: LiveGamePlayer | null;
  target: LiveGamePlayer | null;
  defaultMode?: DamageMode;
  labels: {
    title: string;
    amount: string;
    lifeDamage: string;
    commanderDamage: string;
    infectDamage: string;
    apply: string;
    cancel: string;
  };
  onClose: () => void;
  onConfirm: (input: { amount: number; mode: DamageMode }) => void;
};

export function DamageConfirmSheet({
  visible,
  source,
  target,
  defaultMode = 'life',
  labels,
  onClose,
  onConfirm,
}: DamageConfirmSheetProps) {
  const [amount, setAmount] = useState(1);
  const [mode, setMode] = useState<DamageMode>(defaultMode);

  useEffect(() => {
    if (!visible) return;
    setAmount(1);
    setMode(defaultMode);
  }, [visible, defaultMode, source?.participantKey, target?.participantKey]);

  if (!source || !target) return null;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      scroll={false}
      presentation="dialog"
      maxWidth={520}
      footer={(
        <View style={styles.footerRow}>
          <Button label={labels.cancel} variant="outline" onPress={onClose} style={styles.footerButton} />
          <Button
            label={labels.apply}
            onPress={() => onConfirm({ amount, mode })}
            style={styles.footerButton}
          />
        </View>
      )}
    >
      <ModalHeader
        title={labels.title}
        subtitle={`${source.displayName} → ${target.displayName}`}
        icon="flash-outline"
        onClose={onClose}
      />

      <View style={styles.matchupRow}>
        <View style={styles.matchupPlayer}>
          <DeckImage
            uri={source.commanderImage}
            alt={source.commander}
            style={styles.matchupImage}
            containerStyle={styles.matchupImageWrap}
          />
          <Text style={styles.matchupName} numberOfLines={1}>{source.displayName}</Text>
        </View>

        <View style={styles.arrowWrap}>
          <Ionicons name="arrow-forward" size={22} color={colors.primaryLight} />
        </View>

        <View style={styles.matchupPlayer}>
          <DeckImage
            uri={target.commanderImage}
            alt={target.commander}
            style={styles.matchupImage}
            containerStyle={styles.matchupImageWrap}
          />
          <Text style={styles.matchupName} numberOfLines={1}>{target.displayName}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>{labels.amount}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          style={styles.stepButton}
          onPress={() => setAmount((value) => Math.max(1, value - 1))}
        >
          <Ionicons name="remove" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.amountValue}>{amount}</Text>
        <Pressable
          style={styles.stepButton}
          onPress={() => setAmount((value) => Math.min(99, value + 1))}
        >
          <Ionicons name="add" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.quickRow}>
        {QUICK_AMOUNTS.map((value) => {
          const active = amount === value;
          return (
            <Pressable
              key={value}
              onPress={() => setAmount(value)}
              style={[styles.quickChip, active && styles.quickChipActive]}
            >
              <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>{value}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.typeSegment}>
        {([
          { value: 'life' as const, label: labels.lifeDamage, icon: 'heart-dislike-outline' as const },
          { value: 'commander' as const, label: labels.commanderDamage, icon: 'shield-outline' as const },
          { value: 'infect' as const, label: labels.infectDamage, icon: 'skull-outline' as const },
        ]).map((option) => {
          const active = mode === option.value;
          return (
          <Pressable
            key={option.value}
            style={[styles.typePill, active && styles.typePillActive]}
            onPress={() => setMode(option.value)}
          >
            <Ionicons name={option.icon} size={16} color={active ? colors.primaryForeground : colors.muted} />
            <Text style={[styles.typePillText, active && styles.typePillTextActive]}>
              {option.label}
            </Text>
          </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  matchupPlayer: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  matchupImageWrap: {
    width: 56,
    height: 78,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  matchupImage: {
    width: 56,
    height: 78,
  },
  matchupName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  arrowWrap: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  amountValue: {
    minWidth: 72,
    textAlign: 'center',
    color: colors.foreground,
    fontSize: 44,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  quickChip: {
    minWidth: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  quickChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.selectionTintStrong,
  },
  quickChipText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  quickChipTextActive: {
    color: colors.foreground,
  },
  typeSegment: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.cardInset,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  typePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
  },
  typePillActive: {
    backgroundColor: colors.primary,
  },
  typePillText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  typePillTextActive: {
    color: colors.primaryForeground,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});
