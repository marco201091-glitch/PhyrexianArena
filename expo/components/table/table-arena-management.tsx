import { StyleSheet, Text } from 'react-native';
import { Button } from '@/components/ui/button';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors } from '@/constants/theme';

type TableArenaManagementProps = {
  showExportStats: boolean;
  canManage: boolean;
  canLeave: boolean;
  labels: {
    arenaManagement: string;
    shareInvite: string;
    exportArenaStats: string;
    editArena: string;
    leaveArena: string;
    deleteArena: string;
  };
  onShareInvite: () => void;
  onExportStats: () => void;
  onEdit: () => void;
  onLeave: () => void;
  onDelete: () => void;
};

export function TableArenaManagement({
  showExportStats,
  canManage,
  canLeave,
  labels,
  onShareInvite,
  onExportStats,
  onEdit,
  onLeave,
  onDelete,
}: TableArenaManagementProps) {
  return (
    <PhyrexianPanel style={styles.section}>
      <Text style={styles.sectionTitle}>{labels.arenaManagement}</Text>
      <Button
        label={labels.shareInvite}
        variant="outline"
        icon="person-add-outline"
        onPress={onShareInvite}
      />
      {showExportStats ? (
        <Button
          label={labels.exportArenaStats}
          variant="outline"
          icon="share-outline"
          onPress={onExportStats}
        />
      ) : null}
      {canManage ? (
        <Button
          label={labels.editArena}
          variant="ghost"
          onPress={onEdit}
        />
      ) : null}
      {canLeave ? (
        <Button
          label={labels.leaveArena}
          variant="destructive"
          onPress={onLeave}
        />
      ) : null}
      {canManage ? (
        <Button
          label={labels.deleteArena}
          variant="destructive"
          onPress={onDelete}
        />
      ) : null}
    </PhyrexianPanel>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
  },
});
