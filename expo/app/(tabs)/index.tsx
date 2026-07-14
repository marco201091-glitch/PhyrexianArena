import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAppAlert } from '@/lib/app-alert';
import { ArenaCard } from '@/components/dashboard/arena-card';
import { Button } from '@/components/ui/button';
import { SharePreviewModal } from '@/components/ui/share-preview-modal';
import { Input } from '@/components/ui/input';
import { DashboardSkeleton } from '@/components/ui/screen-skeletons';
import { Modal } from '@/components/ui/modal';
import { Screen } from '@/components/ui/screen';
import { PanelWithActions } from '@/components/ui/panel-with-actions';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { colors } from '@/constants/theme';
import { useGroups } from '@/hooks/use-groups';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { getSiteUrl } from '@/lib/env';
import { fetchGroupByInviteCode } from '@/lib/join-arena';
import { getSupabaseErrorMessage } from '@/lib/supabase-errors';
import { supabase } from '@/lib/supabase';
import { isTabletViewport } from '@/lib/layout';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { copy, language } = useLanguage();
  const router = useRouter();
  const { groups, loading: groupsLoading, refresh: refreshGroups } = useGroups(user?.id);

  const [refreshing, setRefreshing] = useState(false);
  const [sharePreview, setSharePreview] = useState<{ title: string; message: string } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [joiningCode, setJoiningCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const { scrollContentStyle } = useScreenInsets();
  const { width } = useWindowDimensions();
  const useArenaGrid = isTabletViewport(width);

  const formatArenaDate = useCallback((date: string) => {
    try {
      return new Intl.DateTimeFormat(language === 'it' ? 'it-IT' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(date));
    } catch {
      return '';
    }
  }, [language]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshGroups();
    setRefreshing(false);
  }, [refreshGroups]);

  const openInvitePreview = useCallback((code: string) => {
    const url = `${getSiteUrl()}/join/${code}`;
    setSharePreview({ title: copy('copyInviteLink'), message: url });
  }, [copy]);

  const confirmShare = useCallback(async () => {
    if (!sharePreview) return;
    setSharing(true);
    try {
      await Share.share({ message: sharePreview.message, title: sharePreview.title });
      setSharePreview(null);
    } catch {
      showAppAlert(copy('error'), copy('shareStatsFailed'));
    } finally {
      setSharing(false);
    }
  }, [copy, sharePreview]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from('groups')
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      showAppAlert(copy('arenaCreated'), copy('arenaCreatedHint'));
      await refreshGroups();
    } catch (error) {
      showAppAlert(
        copy('error'),
        getSupabaseErrorMessage(error, copy('createArenaFailed')),
      );
    } finally {
      setCreating(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!joiningCode.trim() || !user) return;

    setJoining(true);
    try {
      const group = await fetchGroupByInviteCode(supabase, joiningCode);

      if (!group) {
        showAppAlert(copy('invalidInviteCode'), copy('invalidInviteCodeHint'));
        return;
      }

      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
        });

      if (error) {
        if (error.code === '23505') {
          showAppAlert(copy('alreadyMember'), copy('redirectingToArena'));
        } else {
          throw error;
        }
      } else {
        showAppAlert(copy('joinedArena'), `${copy('welcome')} "${group.name}"`);
      }

      setShowJoinModal(false);
      setJoiningCode('');
      router.push({ pathname: '/table/[id]', params: { id: group.id } });
    } catch (error) {
      showAppAlert(
        copy('error'),
        getSupabaseErrorMessage(error, copy('joinArenaFailed')),
      );
    } finally {
      setJoining(false);
    }
  };

  if (groupsLoading && groups.length === 0) {
    return <DashboardSkeleton contentStyle={scrollContentStyle} />;
  }

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={scrollContentStyle}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <PanelWithActions
          variant="strong"
          actions={(
            <>
              <Button
                label={copy('joinArena')}
                variant="ghost"
                onPress={() => {
                  setJoiningCode('');
                  setShowJoinModal(true);
                }}
                style={styles.actionButton}
              />
              <Button
                label={copy('createArena')}
                onPress={() => setShowCreateModal(true)}
                style={styles.actionButton}
              />
            </>
          )}
        >
          <Text style={styles.title}>{copy('yourArenas')}</Text>
          <Text style={styles.subtitle}>{copy('arenasSubtitle')}</Text>
        </PanelWithActions>

        {groups.length === 0 ? (
          <PhyrexianPanel style={styles.emptyCard}>
            <Ionicons name="skull-outline" size={40} color={colors.muted} />
            <Text style={styles.emptyTitle}>{copy('noArenasTitle')}</Text>
            <Text style={styles.emptyBody}>{copy('noArenasBody')}</Text>
            <Button label={copy('createFirstArena')} onPress={() => setShowCreateModal(true)} />
          </PhyrexianPanel>
        ) : (
          <View style={styles.arenaList}>
            {groups.map((group) => (
              <View key={group.id} style={[styles.arenaItem, useArenaGrid && styles.arenaItemTablet]}>
                <ArenaCard
                  group={group}
                  arenaLabel={copy('arenaLabel')}
                  playersLabel={copy('players')}
                  tableLabel={copy('table')}
                  inviteLabel={copy('invite')}
                  createdLabel={copy('created')}
                  openHint={copy('openArenaHint')}
                  openLabel={copy('open')}
                  copyLabel={copy('copyInviteLink')}
                  formatDate={formatArenaDate}
                  onOpen={() => router.push({ pathname: '/table/[id]', params: { id: group.id } })}
                  onCopyInvite={() => openInvitePreview(group.invite_code)}
                />
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      <SharePreviewModal
        visible={Boolean(sharePreview)}
        title={sharePreview?.title || ''}
        preview={sharePreview?.message || ''}
        previewLabel={copy('sharePreview')}
        shareLabel={copy('shareNow')}
        cancelLabel={copy('cancel')}
        onClose={() => setSharePreview(null)}
        onShare={confirmShare}
        sharing={sharing}
      />

      <Modal visible={showJoinModal} onClose={() => setShowJoinModal(false)}>
        <Text style={styles.modalTitle}>{copy('joinArenaTitle')}</Text>
        <Text style={styles.modalBody}>{copy('joinArenaHint')}</Text>
        <Input
          label={copy('inviteCode')}
          value={joiningCode}
          onChangeText={(value) => setJoiningCode(value.toUpperCase())}
          placeholder={copy('inviteCodePlaceholder')}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <View style={styles.modalActions}>
          <Button
            label={copy('cancel')}
            variant="ghost"
            onPress={() => {
              setShowJoinModal(false);
              setJoiningCode('');
            }}
            style={styles.modalButton}
          />
          <Button
            label={joining ? copy('joining') : copy('join')}
            disabled={joining || !joiningCode.trim()}
            onPress={handleJoinWithCode}
            style={styles.modalButton}
          />
        </View>
      </Modal>

      <Modal visible={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <Text style={styles.modalTitle}>{copy('createArenaTitle')}</Text>
        <Text style={styles.modalBody}>{copy('createArenaHint')}</Text>
        <Input
          label={copy('arenaName')}
          value={newGroupName}
          onChangeText={setNewGroupName}
          placeholder={copy('arenaNamePlaceholder')}
        />
        <Input
          label={copy('arenaDescription')}
          value={newGroupDescription}
          onChangeText={setNewGroupDescription}
          placeholder={copy('arenaDescriptionPlaceholder')}
        />
        <View style={styles.modalActions}>
          <Button
            label={copy('cancel')}
            variant="ghost"
            onPress={() => setShowCreateModal(false)}
            style={styles.modalButton}
          />
          <Button
            label={creating ? copy('creating') : copy('create')}
            disabled={creating || !newGroupName.trim()}
            onPress={handleCreateGroup}
            style={styles.modalButton}
          />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    flex: 1,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  arenaList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  arenaItem: {
    width: '100%',
  },
  arenaItemTablet: {
    width: '48%',
    flexGrow: 1,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalButton: {
    flex: 1,
  },
});
