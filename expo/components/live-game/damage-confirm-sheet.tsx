import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeckImage } from '@/components/deck/deck-image';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ModalHeader } from '@/components/ui/modal-header';
import { colors, radii, spacing } from '@/constants/theme';
import type { DamageMode, GroupDamageScope, LiveGamePlayer } from '@/lib/live-game';

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
    thisPlayer: string;
    eachOpponent: string;
    everyone: string;
  };
  onClose: () => void;
  onConfirm: (input: { amount: number; mode: DamageMode; scope: 'single' | GroupDamageScope }) => void;
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
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState<DamageMode>(defaultMode);
  const [scope, setScope] = useState<'single' | GroupDamageScope>('single');

  useEffect(() => {
    if (!visible) return;
    setAmount(0);
    setMode(defaultMode);
    setScope('single');
  }, [visible, defaultMode, source?.participantKey, target?.participantKey]);

  if (!source || !target) return null;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      scroll={false}
      presentation="dialog"
      maxWidth={760}
      footer={(
        <View style={styles.footerRow}>
          <Button label={labels.cancel} variant="outline" onPress={onClose} style={styles.footerButton} />
          <Button
            label={labels.apply}
            onPress={() => onConfirm({ amount, mode, scope })}
            disabled={amount === 0}
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
            onPress={() => {
              setMode(option.value);
              if (option.value !== 'life') setScope('single');
            }}
          >
            <Ionicons name={option.icon} size={16} color={active ? colors.primaryForeground : colors.muted} />
            <Text style={[styles.typePillText, active && styles.typePillTextActive]}>
              {option.label}
            </Text>
          </Pressable>
          );
        })}
      </View>

      {mode === 'life' ? (
        <View style={styles.typeSegment}>
          {([
            { value: 'single' as const, label: labels.thisPlayer },
            { value: 'opponents' as const, label: labels.eachOpponent },
            { value: 'all_players' as const, label: labels.everyone },
          ]).map((option) => {
            const active = scope === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.scopePill, active && styles.scopePillActive]}
                onPress={() => setScope(option.value)}
              >
                <Text style={[styles.scopeText, active && styles.scopeTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.amountStage}>
        <DeckImage
          uri={target.commanderImage}
          alt={target.commander}
          style={styles.stageImage}
          containerStyle={styles.stageImageWrap}
        />
        <View style={styles.stageShade} />
        <View style={styles.stepperRow}>
          <Pressable
            style={styles.stepButton}
            onPress={() => setAmount((value) => Math.max(0, value - 1))}
            accessibilityRole="button"
          >
            <Ionicons name="remove" size={30} color={colors.foreground} />
          </Pressable>
          <View style={styles.amountCopy}>
            <Text style={styles.amountValue}>{amount}</Text>
            <Text style={styles.amountContext} numberOfLines={2}>
              {mode === 'life' ? labels.lifeDamage : mode === 'commander' ? labels.commanderDamage : labels.infectDamage}
              {' · '}
              {scope === 'opponents' ? labels.eachOpponent : scope === 'all_players' ? labels.everyone : target.displayName}
            </Text>
          </View>
          <Pressable
            style={styles.stepButton}
            onPress={() => setAmount((value) => Math.min(99, value + 1))}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={30} color={colors.foreground} />
          </Pressable>
        </View>
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
              <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>+{value}</Text>
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  amountStage: {
    minHeight: 188,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.38)',
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  stageImageWrap: { ...StyleSheet.absoluteFillObject },
  stageImage: { width: '100%', height: '100%' },
  stageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,4,12,0.76)' },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  stepButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  amountCopy: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  amountValue: {
    textAlign: 'center',
    color: colors.foreground,
    fontSize: 72,
    lineHeight: 78,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  amountContext: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  scopePill: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingHorizontal: spacing.xs,
  },
  scopePillActive: {
    backgroundColor: colors.selectionTintStrong,
  },
  scopeText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  scopeTextActive: {
    color: colors.foreground,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});
