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
    playGame: string;
    recordBattle: string;
  };
  onPlayGame: () => void;
  onRecordBattle: () => void;
};

export function ArenaCommandPanel({
  name,
  description,
  inviteCode,
  labels,
  onPlayGame,
  onRecordBattle,
}: ArenaCommandPanelProps) {
  return (
    <PanelWithActions
      variant="strong"
      actions={(
        <>
          <Button
            label={labels.playGame}
            onPress={onPlayGame}
            icon="play"
            style={styles.playButton}
          />
          <Button
            label={labels.recordBattle}
            variant="outline"
            icon="create-outline"
            onPress={onRecordBattle}
            style={styles.recordButton}
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
  playButton: {
    flex: 1.12,
    minHeight: 54,
  },
  recordButton: {
    flex: 1,
    minHeight: 54,
  },
});
