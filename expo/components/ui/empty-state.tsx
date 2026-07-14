import { type ComponentProps } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors, spacing } from '@/constants/theme';

type EmptyStateProps = {
  icon?: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({
  icon = 'albums-outline',
  title,
  body,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <PhyrexianPanel style={[styles.panel, style]}>
      <Ionicons name={icon} size={36} color={colors.muted} />
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </PhyrexianPanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  action: {
    marginTop: spacing.xs,
    alignSelf: 'stretch',
  },
});