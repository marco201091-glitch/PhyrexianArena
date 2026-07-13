import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { PanelWithActions } from '@/components/ui/panel-with-actions';
import { colors } from '@/constants/theme';

type ArenaCommandPanelProps = {
  name: string;
  description?: string | null;
  inviteCode: string;
  labels: {
    invite: string;
    recordBattle: string;
    shareInvite: string;
  };
  onRecordBattle: () => void;
  onShareInvite: () => void;
};

export function ArenaCommandPanel({
  name,
  description,
  inviteCode,
  labels,
  onRecordBattle,
  onShareInvite,
}: ArenaCommandPanelProps) {
  return (
    <PanelWithActions
      variant="strong"
      actions={(
        <>
          <Button
            label={labels.recordBattle}
            onPress={onRecordBattle}
            style={styles.actionButton}
          />
          <Button
            label={labels.shareInvite}
            variant="ghost"
            onPress={onShareInvite}
            style={styles.actionButton}
          />
        </>
      )}
    >
      <Text style={styles.name}>{name}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      <Text style={styles.inviteMeta}>{labels.invite}: {inviteCode}</Text>
    </PanelWithActions>
  );
}

const styles = StyleSheet.create({
  name: {
    color: colors.foreground,
    fontSize: 26,
    fontWeight: '700',
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  inviteMeta: {
    color: colors.primaryMuted,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  actionButton: {
    flex: 1,
  },
});