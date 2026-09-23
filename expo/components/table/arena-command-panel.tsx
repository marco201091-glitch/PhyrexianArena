import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { PanelWithActions } from '@/components/ui/panel-with-actions';
import { colors } from '@/constants/theme';

type ArenaCommandPanelProps = {
  name: string;
  description?: string | null;
  inviteCode: string;
  season?: { title: string; dates: string; label: string };
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
  season,
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
      {season ? <View style={styles.season}><View style={styles.seasonIcon}><Ionicons name="calendar" size={17} color={colors.primaryLight} /></View><View style={styles.seasonCopy}><Text style={styles.seasonEyebrow}>{season.label}</Text><Text style={styles.seasonTitle}>{season.title}</Text></View><Text style={styles.seasonDates}>{season.dates}</Text></View> : null}
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
  season: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, padding: 9, borderWidth: 1, borderColor: 'rgba(110,231,183,0.22)', borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.07)' },
  seasonIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,185,129,0.13)' },
  seasonCopy: { flex: 1, gap: 2 },
  seasonEyebrow: { color: colors.primaryMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' },
  seasonTitle: { color: colors.foreground, fontSize: 13, fontWeight: '800' },
  seasonDates: { color: colors.muted, fontSize: 11, textAlign: 'right' },
  playButton: {
    flex: 1.12,
    minHeight: 54,
  },
  recordButton: {
    flex: 1,
    minHeight: 54,
  },
});
