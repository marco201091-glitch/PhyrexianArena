import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeckImage } from '@/components/deck/deck-image';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { HoldPressable } from '@/components/ui/hold-pressable';
import { colors, radii, spacing } from '@/constants/theme';
import type { DamageMode, GroupDamageScope, LiveGamePlayer } from '@/lib/live-game';

type DamageConfirmSheetProps = {
  visible: boolean;
  source: LiveGamePlayer | null;
  target: LiveGamePlayer | null;
  sourceRotation?: number;
  defaultMode?: DamageMode;
  commanderMode?: boolean;
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
  sourceRotation = 0,
  defaultMode = 'life',
  commanderMode = true,
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
      maxWidth={440}
    >
      <View style={[styles.damageCard, { transform: [{ rotate: `${sourceRotation}deg` }] }]}>
        <DeckImage
          uri={target.commanderImage}
          alt={target.commander}
          style={styles.stageImage}
          containerStyle={styles.stageImageWrap}
        />
        <View style={styles.stageShade} />
        <View style={styles.damageCardContent}>
          <View style={styles.compactHeader}>
            <Ionicons name="flash-outline" size={20} color={colors.primaryLight} />
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>{labels.title}</Text>
              <Text style={styles.sourceTarget} numberOfLines={1}>{source.displayName} → {target.displayName}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={labels.cancel}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <View style={styles.amountStage}>
          <View style={styles.stepperRow}>
            <HoldPressable
              style={styles.stepButton}
              onShort={() => setAmount((value) => Math.max(0, value - 1))}
              onLong={() => setAmount((value) => Math.max(0, value - 10))}
              accessibilityRole="button"
              accessibilityLabel={`${labels.amount} -`}
            >
              <Ionicons name="remove" size={30} color={colors.foreground} />
            </HoldPressable>
            <View style={styles.amountCopy}>
              <Text style={styles.amountValue}>{amount}</Text>
              <Text style={styles.amountContext} numberOfLines={2}>
                {mode === 'life' ? labels.lifeDamage : mode === 'commander' ? labels.commanderDamage : labels.infectDamage}
                {' · '}
                {scope === 'opponents' ? labels.eachOpponent : scope === 'all_players' ? labels.everyone : target.displayName}
              </Text>
            </View>
            <HoldPressable
              style={styles.stepButton}
              onShort={() => setAmount((value) => Math.min(99, value + 1))}
              onLong={() => setAmount((value) => Math.min(99, value + 10))}
              accessibilityRole="button"
              accessibilityLabel={`${labels.amount} +`}
            >
              <Ionicons name="add" size={30} color={colors.foreground} />
            </HoldPressable>
          </View>
          </View>

          <View style={styles.typeSegment}>
            {([
              { value: 'life' as const, label: labels.lifeDamage, icon: 'heart-dislike-outline' as const },
              { value: 'commander' as const, label: labels.commanderDamage, icon: 'shield-outline' as const },
              { value: 'infect' as const, label: labels.infectDamage, icon: 'skull-outline' as const },
            ].filter((option) => commanderMode || option.value !== 'commander')).map((option) => {
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
                  <Ionicons name={option.icon} size={14} color={active ? colors.primaryForeground : colors.muted} />
                  <Text style={[styles.typePillText, active && styles.typePillTextActive]}>{option.label}</Text>
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

          <View style={styles.footerRow}>
            <Button label={labels.cancel} variant="outline" onPress={onClose} style={styles.footerButton} />
            <Button
              label={labels.apply}
              onPress={() => onConfirm({ amount, mode, scope })}
              disabled={amount === 0}
              style={styles.footerButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  damageCard: {
    width: '100%',
    aspectRatio: 1,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.38)',
    backgroundColor: colors.background,
  },
  damageCardContent: {
    flex: 1,
    gap: 6,
    padding: spacing.sm,
  },
  compactHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '900',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  amountStage: {
    width: '100%',
    flex: 1,
    minHeight: 92,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.38)',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sourceTarget: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  stageImageWrap: { ...StyleSheet.absoluteFillObject },
  stageImage: { width: '100%', height: '100%' },
  stageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,4,12,0.76)' },
  stepperRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  stepButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontSize: 58,
    lineHeight: 62,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  amountContext: {
    color: colors.foreground,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeSegment: {
    flexDirection: 'row',
    gap: 4,
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
    minHeight: 38,
    paddingVertical: 7,
    paddingHorizontal: spacing.xs,
  },
  typePillActive: {
    backgroundColor: colors.primary,
  },
  typePillText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  typePillTextActive: {
    color: colors.primaryForeground,
  },
  scopePill: {
    flex: 1,
    minHeight: 36,
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
    minHeight: 42,
  },
  footerButton: {
    flex: 1,
  },
});
