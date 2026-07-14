import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { parseInlineMarkdown, splitMarkdownLines } from '@/lib/rich-text';

type FormattedMarkdownProps = {
  value: string;
  style?: object;
  numberOfLines?: number;
};

function InlineMarkdown({ text }: { text: string }) {
  return (
    <>
      {parseInlineMarkdown(text).map((token, index) => {
        if (token.type === 'bold') {
          return (
            <Text key={`token-${index}`} style={styles.bold}>
              {token.value}
            </Text>
          );
        }
        if (token.type === 'italic') {
          return (
            <Text key={`token-${index}`} style={styles.italic}>
              {token.value}
            </Text>
          );
        }
        if (token.type === 'strike') {
          return (
            <Text key={`token-${index}`} style={styles.strike}>
              {token.value}
            </Text>
          );
        }
        return <Text key={`token-${index}`}>{token.value}</Text>;
      })}
    </>
  );
}

export function FormattedMarkdown({ value, style, numberOfLines }: FormattedMarkdownProps) {
  const lines = splitMarkdownLines(value);

  return (
    <View style={style}>
      {lines.map((line, index) => {
        const bulletMatch = line.match(/^- (.+)$/);
        if (bulletMatch) {
          return (
            <View key={`line-${index}`} style={styles.bulletRow}>
              <Text style={styles.bulletMarker}>•</Text>
              <Text style={styles.lineText} numberOfLines={numberOfLines}>
                <InlineMarkdown text={bulletMatch[1]} />
              </Text>
            </View>
          );
        }

        if (!line.trim()) {
          return <View key={`line-${index}`} style={styles.spacer} />;
        }

        return (
          <Text key={`line-${index}`} style={styles.lineText} numberOfLines={numberOfLines}>
            <InlineMarkdown text={line} />
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lineText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  bold: {
    fontWeight: '700',
    color: colors.foreground,
    fontStyle: 'normal',
  },
  italic: {
    fontStyle: 'italic',
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  bulletMarker: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  spacer: {
    height: 6,
  },
});