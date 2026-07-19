import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeckImage } from '@/components/deck/deck-image';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { HoldPressable } from '@/components/ui/hold-pressable';
import { colors, radii, spacing } from '@/constants/theme';
import { isIPadViewport } from '@/lib/layout';
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
  const { width, height } = useWindowDimensions();
  const isIPad = isIPadViewport(Platform.OS, width, height);
  const phoneCardSize = Math.max(260, Math.min(400, width - 96, height - 96));
  const compactPhone = !isIPad && phoneCardSize < 300;
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
      maxWidth={isIPad ? 600 : 440}
    >
      <View style={[
        styles.damageCard,
        isIPad && styles.damageCardIPad,
        !isIPad && { width: phoneCardSize, height: phoneCardSize },
        { transform: [{ rotate: `${sourceRotation}deg` }] },
      ]}>
        {isIPad ? (
          <DeckImage
            uri={target.commanderImage}
            alt={target.commander}
            style={styles.stageImage}
            containerStyle={styles.stageImageWrap}
          />
        ) : null}
        <View style={styles.stageShade} />
        <View style={[styles.damageCardContent, compactPhone && styles.damageCardContentCompact, isIPad && styles.damageCardContentIPad]}>
          <View style={[styles.compactHeader, compactPhone && styles.compactHeaderPhone, isIPad && styles.compactHeaderIPad]}>
            <Ionicons name="flash-outline" size={isIPad ? 26 : 20} color={colors.primaryLight} />
            <View style={styles.headerCopy}>
              <Text style={[styles.headerTitle, isIPad && styles.headerTitleIPad]}>{labels.title}</Text>
              <Text style={[styles.sourceTarget, isIPad && styles.sourceTargetIPad]} numberOfLines={1}>
                {source.displayName} → {target.displayName}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeButton, isIPad && styles.closeButtonIPad]}
              accessibilityRole="button"
              accessibilityLabel={labels.cancel}
            >
              <Ionicons name="close" size={isIPad ? 26 : 20} color={colors.muted} />
            </Pressable>
          </View>

          <View style={[styles.amountStage, compactPhone && styles.amountStageCompact, isIPad && styles.amountStageIPad]}>
          <View style={[styles.stepperRow, isIPad && styles.stepperRowIPad]}>
            <HoldPressable
              style={[styles.stepButton, compactPhone && styles.stepButtonCompact, isIPad && styles.stepButtonIPad]}
              onShort={() => setAmount((value) => Math.max(0, value - 1))}
              onLong={() => setAmount((value) => Math.max(0, value - 10))}
              accessibilityRole="button"
              accessibilityLabel={`${labels.amount} -`}
            >
              <Ionicons name="remove" size={isIPad ? 40 : 30} color={colors.foreground} />
            </HoldPressable>
            <View style={styles.amountCopy}>
              <Text style={[styles.amountValue, compactPhone && styles.amountValueCompact, isIPad && styles.amountValueIPad]}>{amount}</Text>
              <Text style={[styles.amountContext, isIPad && styles.amountContextIPad]} numberOfLines={2}>
                {mode === 'life' ? labels.lifeDamage : mode === 'commander' ? labels.commanderDamage : labels.infectDamage}
                {' · '}
                {scope === 'opponents' ? labels.eachOpponent : scope === 'all_players' ? labels.everyone : target.displayName}
              </Text>
            </View>
            <HoldPressable
              style={[styles.stepButton, compactPhone && styles.stepButtonCompact, isIPad && styles.stepButtonIPad]}
              onShort={() => setAmount((value) => Math.min(99, value + 1))}
              onLong={() => setAmount((value) => Math.min(99, value + 10))}
              accessibilityRole="button"
              accessibilityLabel={`${labels.amount} +`}
            >
              <Ionicons name="add" size={isIPad ? 40 : 30} color={colors.foreground} />
            </HoldPressable>
          </View>
          </View>

          <View style={[styles.typeSegment, isIPad && styles.typeSegmentIPad]}>
            {([
              { value: 'life' as const, label: labels.lifeDamage, icon: 'heart-dislike-outline' as const },
              { value: 'commander' as const, label: labels.commanderDamage, icon: 'shield-outline' as const },
              { value: 'infect' as const, label: labels.infectDamage, icon: 'skull-outline' as const },
            ].filter((option) => commanderMode || option.value !== 'commander')).map((option) => {
              const active = mode === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.typePill, compactPhone && styles.typePillCompact, isIPad && styles.typePillIPad, active && styles.typePillActive]}
                  onPress={() => {
                    setMode(option.value);
                    if (option.value !== 'life') setScope('single');
                  }}
                >
                  <Ionicons name={option.icon} size={isIPad ? 19 : 14} color={active ? colors.primaryForeground : colors.muted} />
                  <Text style={[styles.typePillText, isIPad && styles.typePillTextIPad, active && styles.typePillTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {mode === 'life' ? (
            <View style={[styles.typeSegment, isIPad && styles.typeSegmentIPad]}>
              {([
                { value: 'single' as const, label: labels.thisPlayer },
                { value: 'opponents' as const, label: labels.eachOpponent },
                { value: 'all_players' as const, label: labels.everyone },
              ]).map((option) => {
                const active = scope === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.scopePill, compactPhone && styles.scopePillCompact, isIPad && styles.scopePillIPad, active && styles.scopePillActive]}
                    onPress={() => setScope(option.value)}
                  >
                    <Text style={[styles.scopeText, isIPad && styles.scopeTextIPad, active && styles.scopeTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={[styles.footerRow, compactPhone && styles.footerRowCompact, isIPad && styles.footerRowIPad]}>
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
    position: 'relative',
    zIndex: 2,
    elevation: 2,
  },
  damageCardIPad: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 600,
  },
  damageCardContentIPad: {
    gap: 10,
    padding: spacing.md,
  },
  damageCardContentCompact: {
    gap: 3,
    padding: 6,
  },
  compactHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactHeaderIPad: {
    minHeight: 52,
  },
  compactHeaderPhone: {
    minHeight: 32,
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
  headerTitleIPad: {
    fontSize: 21,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  closeButtonIPad: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
  amountStageIPad: {
    minHeight: 150,
  },
  amountStageCompact: {
    minHeight: 76,
  },
  sourceTarget: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sourceTargetIPad: {
    fontSize: 13,
  },
  stageImageWrap: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  stageImage: { width: '100%', height: '100%' },
  stageShade: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    backgroundColor: 'rgba(24,4,12,0.76)',
  },
  stepperRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  stepperRowIPad: {
    paddingHorizontal: spacing.lg,
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
  stepButtonIPad: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  stepButtonCompact: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
  amountValueIPad: {
    fontSize: 88,
    lineHeight: 94,
  },
  amountValueCompact: {
    fontSize: 48,
    lineHeight: 50,
  },
  amountContext: {
    color: colors.foreground,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountContextIPad: {
    fontSize: 13,
    lineHeight: 17,
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
  typeSegmentIPad: {
    gap: 6,
    padding: 6,
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
  typePillIPad: {
    minHeight: 52,
  },
  typePillCompact: {
    minHeight: 32,
    paddingVertical: 4,
  },
  typePillActive: {
    backgroundColor: colors.primary,
  },
  typePillText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  typePillTextIPad: {
    fontSize: 13,
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
  scopePillIPad: {
    minHeight: 48,
  },
  scopePillCompact: {
    minHeight: 30,
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
  scopeTextIPad: {
    fontSize: 13,
  },
  scopeTextActive: {
    color: colors.foreground,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 42,
  },
  footerRowIPad: {
    minHeight: 54,
  },
  footerRowCompact: {
    minHeight: 36,
  },
  footerButton: {
    flex: 1,
  },
});
