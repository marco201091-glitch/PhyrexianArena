import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

type DeckExternalLinkTone = 'violet' | 'blue' | 'purple';

const toneStyles: Record<DeckExternalLinkTone, { border: string; bg: string; text: string }> = {
  violet: {
    border: colors.selectionBorder,
    bg: colors.selectionTint,
    text: colors.primaryForeground,
  },
  blue: {
    border: 'rgba(59, 130, 246, 0.25)',
    bg: 'rgba(59, 130, 246, 0.1)',
    text: '#bfdbfe',
  },
  purple: {
    border: 'rgba(168, 85, 247, 0.25)',
    bg: 'rgba(168, 85, 247, 0.1)',
    text: '#e9d5ff',
  },
};

type DeckExternalLinkChipProps = {
  href: string;
  label: string;
  tone?: DeckExternalLinkTone;
};

export function DeckExternalLinkChip({ href, label, tone = 'violet' }: DeckExternalLinkChipProps) {
  const palette = toneStyles[tone];

  return (
    <Pressable
      onPress={() => void Linking.openURL(href)}
      style={[styles.chip, { borderColor: palette.border, backgroundColor: palette.bg }]}
    >
      <Ionicons name="open-outline" size={14} color={palette.text} />
      <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
});