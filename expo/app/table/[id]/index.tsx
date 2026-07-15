import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAppAlert } from '@/lib/app-alert';
import { AddGuestModal, type GuestModalMode } from '@/components/table/add-guest-modal';
import { EditMatchModal } from '@/components/table/edit-match-modal';
import { ArenaFilterPanel } from '@/components/table/arena-filter-panel';
import { ArenaTabBar } from '@/components/table/arena-tab-bar';
import { ArenaCommandPanel } from '@/components/table/arena-command-panel';
import { TableArenaManagement } from '@/components/table/table-arena-management';
import { TableDecksTab } from '@/components/table/table-decks-tab';
import { TableGuestsSection } from '@/components/table/table-guests-section';
import { TableMatchesList } from '@/components/table/table-matches-list';
import { TableMetaTab } from '@/components/table/table-meta-tab';
import { TablePlayersTab } from '@/components/table/table-players-tab';
import { RecordMatchModal } from '@/components/table/record-match-modal';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextInput } from '@/components/ui/rich-text-input';
import { ArenaSkeleton } from '@/components/ui/screen-skeletons';
import { Modal } from '@/components/ui/modal';
import { Screen } from '@/components/ui/screen';
import { SharePreviewModal } from '@/components/ui/share-preview-modal';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { colors, spacing } from '@/constants/theme';
import { useArena } from '@/hooks/use-arena';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useToast } from '@/contexts/toast-context';
import { hapticSuccess } from '@/lib/haptics';
import { computeArenaColorAnalytics } from '@/lib/arena-color-analytics';
import { calculateCommanderStats, type DeckStatsSort } from '@/lib/arena-deck-stats';
import {
  filterMatchesByDate,
  getArenaPeriodLabel,
  getBracketOptionsFromMatches,
  type ArenaDateFilter,
} from '@/lib/arena-filters';
import { canKickArenaMember, canLeaveArena, canManageArenaMembership, isArenaMember } from '@/lib/arena-membership';
import { getParticipantDeckSnapshot, getParticipantDisplayName } from '@/lib/arena-participants';
import {
  buildArenaSessionExportText,
  type ArenaSessionExportMatch,
} from '@/lib/arena-session-export';
import { buildMatchShareText } from '@/lib/arena-match-share';
import { groupMatchesByDay } from '@/lib/arena-session';
import { buildArenaShareText } from '@/lib/arena-share';
import { calculatePlayerStats, getMatchWinnerName } from '@/lib/arena-stats';
import { getSiteUrl } from '@/lib/env';
import { isLeaveArenaConfirmationValid } from '@/lib/leave-arena-confirm';
import { MANA_COLOR_LABELS } from '@/lib/mana-colors';

import { fetchActiveLiveGame } from '@/lib/live-game-service';
import { toUserParticipantKey } from '@/lib/participant-keys';
import { getSupabaseErrorMessage } from '@/lib/supabase-errors';
import { supabase } from '@/lib/supabase';
import type { ArenaMatch } from '@/lib/types/arena';

type ArenaTab = 'matches' | 'players' | 'decks' | 'meta';

const DATE_FILTERS: ArenaDateFilter[] = ['all', '7d', '30d', '90d'];

const DATE_FILTER_KEYS = {
  all: 'filterAllTime',
  '7d': 'filter7d',
  '30d': 'filter30d',
  '90d': 'filter90d',
} as const;

const DECK_SORT_KEYS: Record<DeckStatsSort, 'deckSortWinRate' | 'deckSortGamesPlayed' | 'deckSortWins'> = {
  winRate: 'deckSortWinRate',
  gamesPlayed: 'deckSortGamesPlayed',
  wins: 'deckSortWins',
};

export default function TableScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const { copy, language } = useLanguage();
  const router = useRouter();

  const {
    group,
    members,
    matches,
    guests,
    decks,
    loading,
    refresh,
    createMatch,
    updateGroup,
    updateMatch,
    kickMember,
    deleteArena,
    leaveArena,
    deleteMatch,
    addGuest,
    addGuestDeck,
    removeGuest,
  } = useArena(groupId, user?.id);

  const [activeTab, setActiveTab] = useState<ArenaTab>('matches');
  const { scrollContentStyle } = useScreenInsets();
  const { showToast } = useToast();
  const [dateFilter, setDateFilter] = useState<ArenaDateFilter>('all');
  const [bracketFilter, setBracketFilter] = useState('all');
  const [deckStatsSort, setDeckStatsSort] = useState<DeckStatsSort>('winRate');
  const [refreshing, setRefreshing] = useState(false);
  const [activeLiveGameId, setActiveLiveGameId] = useState<string | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestModalMode, setGuestModalMode] = useState<GuestModalMode | undefined>(undefined);
  const [guestModalTargetId, setGuestModalTargetId] = useState<string | null>(null);
  const [savingGuest, setSavingGuest] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<ArenaMatch | null>(null);
  const [exportDayKey, setExportDayKey] = useState<string | null>(null);
  const [exportIntro, setExportIntro] = useState('');
  const [savingMatch, setSavingMatch] = useState(false);
  const [savingEditMatch, setSavingEditMatch] = useState(false);
  const [savingArena, setSavingArena] = useState(false);
  const [leavingArena, setLeavingArena] = useState(false);
  const [deletingArena, setDeletingArena] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [expandedDayKeys, setExpandedDayKeys] = useState<Set<string>>(new Set());
  const [sharePreview, setSharePreview] = useState<{ title: string; message: string } | null>(null);
  const [sharing, setSharing] = useState(false);

  const refreshActiveLiveGame = useCallback(async () => {
    if (!groupId || !user) {
      setActiveLiveGameId(null);
      return;
    }
    try {
      const game = await fetchActiveLiveGame(
        supabase,
        groupId,
        toUserParticipantKey(user.id),
      );
      setActiveLiveGameId(game?.id ?? null);
    } catch {
      setActiveLiveGameId(null);
    }
  }, [groupId, user]);

  useFocusEffect(
    useCallback(() => {
      void refreshActiveLiveGame();
    }, [refreshActiveLiveGame]),
  );

  const isMember = isArenaMember(members, user?.id);
  const canManage = canManageArenaMembership({
    userId: user?.id,
    group,
    isPlatformAdmin: false,
  });
  const canLeave = canLeaveArena(members.length, isMember);

  const filteredMatches = useMemo(
    () => filterMatchesByDate(matches, dateFilter),
    [dateFilter, matches],
  );

  const playerStats = useMemo(
    () => calculatePlayerStats(filteredMatches),
    [filteredMatches],
  );

  const commanderStats = useMemo(
    () => calculateCommanderStats(filteredMatches, bracketFilter, deckStatsSort),
    [bracketFilter, deckStatsSort, filteredMatches],
  );

  const bracketOptions = useMemo(
    () => getBracketOptionsFromMatches(filteredMatches),
    [filteredMatches],
  );

  const colorAnalytics = useMemo(
    () => computeArenaColorAnalytics(filteredMatches, new Map(), bracketFilter),
    [bracketFilter, filteredMatches],
  );

  const matchDayGroups = useMemo(() => {
    const locale = language === 'it' ? 'it-IT' : 'en-US';
    return groupMatchesByDay(filteredMatches, {
      formatLabel: (dayKey) => {
        const [year, month, day] = dayKey.split('-').map(Number);
        return new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(new Date(year, month - 1, day));
      },
    });
  }, [filteredMatches, language]);

  const latestDayKey = matchDayGroups[0]?.dayKey ?? null;



  useEffect(() => {
    if (!latestDayKey) {
      setExpandedDayKeys(new Set());
      return;
    }

    setExpandedDayKeys((current) => {
      if (current.size === 0) {
        return new Set([latestDayKey]);
      }

      const next = new Set(current);
      next.add(latestDayKey);
      return next;
    });
  }, [latestDayKey]);

  const toggleDayGroup = useCallback((dayKey: string, open: boolean) => {
    setExpandedDayKeys((current) => {
      const next = new Set(current);
      if (open) {
        next.add(dayKey);
      } else {
        next.delete(dayKey);
      }
      return next;
    });
  }, []);

  const closeExportModal = useCallback(() => {
    setExportDayKey(null);
    setExportIntro('');
  }, []);

  const openDayExportModal = useCallback((dayKey: string) => {
    setExportDayKey(dayKey);
    setExportIntro('');
  }, []);

  const exportDayGroup = useMemo(
    () => matchDayGroups.find((entry) => entry.dayKey === exportDayKey) ?? null,
    [exportDayKey, matchDayGroups],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshActiveLiveGame()]);
    setRefreshing(false);
  }, [refresh, refreshActiveLiveGame]);

  const shareInvite = useCallback(() => {
    if (!group) return;
    const url = `${getSiteUrl()}/join/${group.invite_code}`;
    setSharePreview({ title: copy('shareInvite'), message: url });
  }, [copy, group]);

  const buildArenaStatsShareMessage = useCallback(() => {
    if (!group) return '';

    const locale = language === 'it' ? 'it-IT' : 'en-US';
    return buildArenaShareText({
      arenaName: group.name,
      periodLabel: getArenaPeriodLabel(dateFilter, language),
      totalMatches: filteredMatches.length,
      topPlayers: playerStats.slice(0, 5).map((player) => ({
        displayName: player.displayName,
        gamesPlayed: player.gamesPlayed,
        wins: player.wins,
        winRate: player.winRate,
      })),
      topDecks: commanderStats.slice(0, 5).map((deck) => ({
        commander: deck.commander,
        gamesPlayed: deck.gamesPlayed,
        wins: deck.wins,
        winRate: deck.winRate,
        bracket: deck.bracket,
      })),
      topColors: colorAnalytics.played.slice(0, 5).map((entry) => ({
        label: MANA_COLOR_LABELS[entry.color]?.[language] || entry.color,
        gamesPlayed: entry.appearances,
        percentage: entry.percentage,
      })),
      recentMatches: filteredMatches.slice(0, 3).map((match) => ({
        playedAt: match.played_at,
        notes: match.notes,
        winnerName: getMatchWinnerName(match, copy('liveGameDraw')),
        participants: match.match_participants.map((participant) => {
          const deck = getParticipantDeckSnapshot(participant);
          return {
            displayName: getParticipantDisplayName(participant),
            commander: deck?.commander || null,
            deckName: deck?.name || null,
            isWinner: participant.is_winner,
            bracket: deck?.bracket || null,
          };
        }),
      })),
      publicUrl: group.is_public ? `${getSiteUrl()}/arena/${group.invite_code}` : null,
    }, {
      arenaStatsTitle: copy('arenaStatsTitle'),
      period: copy('period'),
      totalMatches: copy('totalMatchesLabel'),
      topPlayers: copy('leaderboard'),
      topDecks: copy('topDecks'),
      topColors: copy('mostPlayedColors'),
      recentMatches: copy('recentMatches'),
      winner: copy('winner'),
      winRate: copy('winRate'),
      publicPage: copy('publicPage'),
      noComment: copy('noComment'),
    }, locale);
  }, [
    colorAnalytics.played,
    commanderStats,
    copy,
    dateFilter,
    filteredMatches,
    group,
    language,
    playerStats,
  ]);

  const shareArenaStats = useCallback(() => {
    if (!group) return;
    setSharePreview({
      title: `${group.name} - Phyrexian Arena`,
      message: buildArenaStatsShareMessage(),
    });
  }, [buildArenaStatsShareMessage, group]);

  const confirmSharePreview = useCallback(async () => {
    if (!sharePreview) return;
    setSharing(true);
    try {
      await Share.share({
        title: sharePreview.title,
        message: sharePreview.message,
      });
      setSharePreview(null);
      showToast(copy('statsShared'));
    } catch {
      showAppAlert(copy('error'), copy('shareStatsFailed'));
    } finally {
      setSharing(false);
    }
  }, [copy, sharePreview, showToast]);

  const buildSessionExportMatch = (match: ArenaMatch): ArenaSessionExportMatch => ({
    participants: match.match_participants.map((participant) => {
      const deck = getParticipantDeckSnapshot(participant);
      const commanderLabel = deck?.commander?.trim() || deck?.name?.trim() || '—';
      return {
        displayName: getParticipantDisplayName(participant),
        commanderLabel,
      };
    }),
    notes: match.notes,
  });

  const handleExportDayMatches = useCallback(async () => {
    if (!group || !exportDayGroup) return;

    const exportMatches = [...exportDayGroup.matches]
      .reverse()
      .map((match) => buildSessionExportMatch(match));
    const text = buildArenaSessionExportText(exportIntro, exportMatches);
    if (!text.trim()) return;

    try {
      await Share.share({
        title: exportDayGroup.label,
        message: text,
      });
      closeExportModal();
      showToast(copy('exportCopied'));
    } catch {
      showAppAlert(copy('error'), copy('shareStatsFailed'));
    }
  }, [closeExportModal, copy, exportDayGroup, exportIntro, group, showToast]);

  const handleShareMatch = useCallback(
    (match: ArenaMatch) => {
      if (!group) return;
      const locale = language === 'it' ? 'it-IT' : 'en-US';
      const message = buildMatchShareText(match, group.name, {
        matchTitle: copy('matchShareTitle'),
        playersAndDecks: copy('playersAndDecks'),
        noDeckSelected: copy('noDeckSelected'),
        winner: copy('winner'),
        draw: copy('liveGameDraw'),
        comment: copy('comment'),
        noComment: copy('noComment'),
      }, locale);
      setSharePreview({ title: copy('shareMatchLog'), message });
    },
    [copy, group, language],
  );

  const openEditModal = () => {
    if (!group) return;
    setEditName(group.name);
    setEditDescription(group.description || '');
    setEditIsPublic(Boolean(group.is_public));
    setShowEditModal(true);
  };

  const handleUpdateArena = async () => {
    if (!editName.trim()) return;
    setSavingArena(true);
    try {
      await updateGroup(editName, editDescription, editIsPublic);
      setShowEditModal(false);
      showToast(copy('arenaUpdated'));
    } catch (error) {
      showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('updateArenaFailed')));
    } finally {
      setSavingArena(false);
    }
  };

  const handleLeaveArena = async () => {
    if (!isLeaveArenaConfirmationValid(leaveConfirm)) {
      showAppAlert(copy('error'), copy('leaveArenaHint'));
      return;
    }

    setLeavingArena(true);
    try {
      await leaveArena();
      setShowLeaveModal(false);
      router.replace('/(tabs)');
    } catch (error) {
      showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('leaveArenaFailed')));
    } finally {
      setLeavingArena(false);
    }
  };

  const handleDeleteArena = async () => {
    if (!group || deleteConfirm !== group.name) return;

    setDeletingArena(true);
    try {
      await deleteArena();
      setShowDeleteModal(false);
      showAppAlert(copy('arenaDeleted'));
      router.replace('/(tabs)');
    } catch (error) {
      showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('deleteArenaFailed')));
    } finally {
      setDeletingArena(false);
    }
  };

  const handleKickMember = (memberId: string, displayName: string) => {
    showAppAlert(copy('removeMember'), copy('removeMemberConfirm'), [
      { text: copy('cancel'), style: 'cancel' },
      {
        text: copy('removeMember'),
        style: 'destructive',
        onPress: async () => {
          try {
            await kickMember(memberId);
            showAppAlert(copy('memberRemoved'), displayName);
          } catch (error) {
            showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('removeMemberFailed')));
          }
        },
      },
    ]);
  };

  const handleDeleteGuest = (guestId: string) => {
    showAppAlert(copy('deleteGuest'), copy('deleteGuestConfirm'), [
      { text: copy('cancel'), style: 'cancel' },
      {
        text: copy('deleteGuest'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeGuest(guestId);
            showAppAlert(copy('guestDeleted'));
          } catch (error) {
            showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('saveGuestFailed')));
          }
        },
      },
    ]);
  };

  const handleDeleteMatch = (matchId: string) => {
    showAppAlert(copy('deleteMatch'), copy('deleteMatchConfirm'), [
      { text: copy('cancel'), style: 'cancel' },
      {
        text: copy('deleteMatch'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMatch(matchId);
            showToast(copy('matchDeleted'));
          } catch (error) {
            showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('saveMatchFailed')));
          }
        },
      },
    ]);
  };

  if (loading && !group) {
    return <ArenaSkeleton contentStyle={scrollContentStyle} />;
  }

  if (!group) {
    return (
      <Screen safeBottom>
        <PhyrexianPanel style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{copy('arenaNotFound')}</Text>
          <Button label={copy('goToDashboard')} onPress={() => router.replace('/(tabs)')} />
        </PhyrexianPanel>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} safeBottom padded={false}>
      <ScrollView
        contentContainerStyle={scrollContentStyle}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={colors.primaryMuted} />
          <Text style={styles.backLabel}>{copy('back')}</Text>
        </Pressable>

        {activeLiveGameId ? (
          <PhyrexianPanel style={styles.resumePanel}>
            <Text style={styles.resumeTitle}>{copy('gameInProgress')}</Text>
            <Text style={styles.resumeHint}>{copy('resumeGameHint')}</Text>
            <Button
              label={copy('resumeGame')}
              icon="play"
              onPress={() => router.push(`/table/${groupId}/play`)}
            />
          </PhyrexianPanel>
        ) : null}

        <ArenaCommandPanel
          name={group.name}
          description={group.description}
          inviteCode={group.invite_code}
          labels={{
            invite: copy('invite'),
            playGame: copy('playGame'),
            recordBattle: copy('recordBattle'),
          }}
          onPlayGame={() => router.push(`/table/${groupId}/play`)}
          onRecordBattle={() => setShowRecordModal(true)}
        />

        <ArenaTabBar
          activeTab={activeTab}
          labels={{
            matches: copy('matchesTab'),
            players: copy('playersTab'),
            decks: copy('decksTab'),
            meta: copy('metaTab'),
          }}
          onChange={setActiveTab}
        />

        <ArenaFilterPanel
          activeTab={activeTab}
          dateFilter={dateFilter}
          bracketFilter={bracketFilter}
          deckStatsSort={deckStatsSort}
          bracketOptions={bracketOptions}
          dateFilters={DATE_FILTERS}
          dateFilterLabels={{
            all: copy(DATE_FILTER_KEYS.all),
            '7d': copy(DATE_FILTER_KEYS['7d']),
            '30d': copy(DATE_FILTER_KEYS['30d']),
            '90d': copy(DATE_FILTER_KEYS['90d']),
          }}
          deckSortLabels={{
            winRate: copy(DECK_SORT_KEYS.winRate),
            gamesPlayed: copy(DECK_SORT_KEYS.gamesPlayed),
            wins: copy(DECK_SORT_KEYS.wins),
          }}
          labels={{
            filterPeriod: copy('filterPeriod'),
            bracket: copy('bracket'),
            allBrackets: copy('allBrackets'),
            sortBy: copy('sortBy'),
          }}
          onDateFilterChange={setDateFilter}
          onBracketFilterChange={setBracketFilter}
          onDeckStatsSortChange={setDeckStatsSort}
        />

        {activeTab === 'matches' ? (
          <TableMatchesList
            dayGroups={matchDayGroups}
            expandedDayKeys={expandedDayKeys}
            emptyTitle={copy('noMatchesTitle')}
            emptyBody={copy('noMatchesBody')}
            recordBattleLabel={copy('recordBattle')}
            matchCountLabel={(count) => copy(count === 1 ? 'matchSingular' : 'matchPlural')}
            onToggleDay={toggleDayGroup}
            onEditMatch={setEditingMatch}
            onShareMatch={handleShareMatch}
            onDeleteMatch={handleDeleteMatch}
            onRecordBattle={() => setShowRecordModal(true)}
            exportDayLabel={copy('exportDay')}
            drawLabel={copy('liveGameDraw')}
            onExportDay={openDayExportModal}
          />
        ) : null}

        {activeTab === 'players' ? (
          <TablePlayersTab
            filteredMatchCount={filteredMatches.length}
            members={members}
            playerStats={playerStats}
            group={group}
            userId={user?.id}
            isCreator={canManage}
            labels={{
              totalGames: copy('totalGames'),
              players: copy('players'),
              users: copy('users'),
              leaderboard: copy('leaderboard'),
              playerLeaderboard: copy('playerLeaderboard'),
              playerLeaderboardHint: copy('playerLeaderboardHint'),
              noMatchesBody: copy('noMatchesBody'),
              games: copy('games'),
              wins: copy('wins'),
              winRate: copy('winRate'),
              guestBadge: copy('guestBadge'),
              creator: copy('creator'),
              you: copy('you'),
            }}
            canKickMember={(memberId) => canKickArenaMember({
              actorId: user?.id || '',
              targetId: memberId,
              group,
              isPlatformAdmin: false,
            })}
            onKickMember={handleKickMember}
          />
        ) : null}

        {activeTab === 'decks' ? (
          <TableDecksTab
            commanderStats={commanderStats}
            labels={{
              noDeckStatsTitle: copy('noDeckStatsTitle'),
              noDeckStatsBody: copy('noDeckStatsBody'),
              bestDeck: copy('bestDeck'),
              uniqueDecks: copy('uniqueDecks'),
              winRate: copy('winRate'),
              trackedDecks: copy('trackedDecks'),
              deckRankings: copy('deckRankings'),
              bracket: copy('bracket'),
              games: copy('games'),
            }}
          />
        ) : null}

        {activeTab === 'meta' ? (
          <TableMetaTab
            filteredMatchCount={filteredMatches.length}
            colorAnalytics={colorAnalytics}
            language={language}
            labels={{
              noMetaDataTitle: copy('noMetaDataTitle'),
              noMetaDataBody: copy('noMetaDataBody'),
              missingColorGames: copy('missingColorGames'),
              colorMeta: copy('colorMeta'),
              colorMetaHint: copy('colorMetaHint'),
              multicolorIdentities: copy('multicolorIdentities'),
              multicolorIdentitiesHint: copy('multicolorIdentitiesHint'),
              colorLabel: copy('colorLabel'),
              sortBy: copy('sortBy'),
              appearances: copy('appearances'),
              wins: copy('wins'),
              winRate: copy('winRate'),
              noGamesInPeriod: copy('noGamesInPeriod'),
              minThreeGames: copy('minThreeGames'),
              noColorsResolved: copy('noColorsResolved'),
              noMulticolorIdentities: copy('noMulticolorIdentities'),
              multicolorPairsHint: copy('multicolorPairsHint'),
              pentacolor: copy('pentacolor'),
            }}
          />
        ) : null}

        {(canManage || guests.length > 0) ? (
          <TableGuestsSection
            guests={guests}
            canManage={canManage}
            labels={{
              guestManagement: copy('guestManagement'),
              addGuest: copy('addGuest'),
              noGuestsBody: copy('noGuestsBody'),
              guestBadge: copy('guestBadge'),
            }}
            onAddGuest={() => {
              setGuestModalMode(undefined);
              setGuestModalTargetId(null);
              setShowGuestModal(true);
            }}
            onAddDeckToGuest={(guestId) => {
              setGuestModalMode('add-deck-to-guest');
              setGuestModalTargetId(guestId);
              setShowGuestModal(true);
            }}
            onDeleteGuest={handleDeleteGuest}
          />
        ) : null}

        {isMember ? (
          <TableArenaManagement
            showExportStats={filteredMatches.length > 0}
            canManage={canManage}
            canLeave={canLeave}
            labels={{
              arenaManagement: copy('arenaManagement'),
              shareInvite: copy('shareInvite'),
              exportArenaStats: copy('shareStats'),
              editArena: copy('editArena'),
              leaveArena: copy('leaveArena'),
              deleteArena: copy('deleteArena'),
            }}
            onShareInvite={shareInvite}
            onExportStats={shareArenaStats}
            onEdit={openEditModal}
            onLeave={() => {
              setLeaveConfirm('');
              setShowLeaveModal(true);
            }}
            onDelete={() => {
              setDeleteConfirm('');
              setShowDeleteModal(true);
            }}
          />
        ) : null}
      </ScrollView>

      <SharePreviewModal
        visible={Boolean(sharePreview)}
        title={sharePreview?.title || ''}
        preview={sharePreview?.message || ''}
        previewLabel={copy('sharePreview')}
        shareLabel={copy('shareNow')}
        cancelLabel={copy('cancel')}
        onClose={() => setSharePreview(null)}
        onShare={confirmSharePreview}
        sharing={sharing}
      />

      <AddGuestModal
        visible={showGuestModal}
        saving={savingGuest}
        guests={guests}
        initialMode={guestModalMode}
        initialGuestId={guestModalTargetId}
        labels={{
          title: copy('addGuestTitle'),
          addDeckTitle: copy('addGuestDeckTitle'),
          hint: copy('addGuestHint'),
          addDeckHint: copy('addGuestDeckHint'),
          pickExistingHint: copy('pickExistingGuestHint'),
          existingGuests: copy('existingGuests'),
          createNewGuest: copy('createNewGuest'),
          backToExistingGuests: copy('backToExistingGuests'),
          guestName: copy('guestName'),
          guestNamePlaceholder: copy('guestNamePlaceholder'),
          deckName: copy('deckName'),
          deckNamePlaceholder: copy('deckNamePlaceholder'),
          searchCommander: copy('searchCommander'),
          searchPlaceholder: copy('searchPlaceholder'),
          searching: copy('searching'),
          noResults: copy('noCommanderResults'),
          selectedCommander: copy('selectedCommander'),
          partnerHint: copy('partnerHint'),
          chooseCommanderArt: copy('chooseCommanderArt'),
          loadingArts: copy('loadingArts'),
          noArtsFound: copy('noArtsFound'),
          printing: copy('printing'),
          cancel: copy('cancel'),
          save: copy('save'),
          saveDeck: copy('saveGuestDeck'),
          saving: copy('saving'),
          nameRequired: copy('nameRequired'),
          commanderRequired: copy('commanderRequired'),
          decks: copy('decks'),
          addDeckToGuest: copy('addDeckToGuest'),
        }}
        onClose={() => {
          setShowGuestModal(false);
          setGuestModalMode(undefined);
          setGuestModalTargetId(null);
        }}
        onError={(message) => showAppAlert(copy('error'), message)}
        onPickExisting={() => setShowGuestModal(false)}
        onSaveCreate={async (input) => {
          setSavingGuest(true);
          try {
            await addGuest({
              displayName: input.displayName,
              commander: input.commander,
              partnerCommander: input.partnerCommander,
              deckName: input.deckName,
              selectedArtUrl: input.selectedArtUrl,
            });
            setShowGuestModal(false);
            setGuestModalMode(undefined);
            setGuestModalTargetId(null);
            showToast(copy('guestAddedHint'));
          } catch (error) {
            showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('saveGuestFailed')));
          } finally {
            setSavingGuest(false);
          }
        }}
        onSaveAddDeck={async (input) => {
          setSavingGuest(true);
          try {
            await addGuestDeck({
              guestId: input.guestId,
              commander: input.commander,
              partnerCommander: input.partnerCommander,
              deckName: input.deckName,
              selectedArtUrl: input.selectedArtUrl,
            });
            setShowGuestModal(false);
            setGuestModalMode(undefined);
            setGuestModalTargetId(null);
            showToast(copy('guestDeckAddedHint'));
          } catch (error) {
            showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('saveGuestFailed')));
          } finally {
            setSavingGuest(false);
          }
        }}
      />

      <RecordMatchModal
        visible={showRecordModal}
        saving={savingMatch}
        members={members}
        guests={guests}
        decks={decks}
        matches={matches}
        labels={{
          title: copy('recordMatchTitle'),
          hint: copy('recordMatchHint'),
          selectPlayers: copy('selectPlayers'),
          selectGuests: copy('selectGuests'),
          selectWinner: copy('selectWinner'),
          draw: copy('liveGameDraw'),
          battleDate: copy('battleDate'),
          notes: copy('notes'),
          notesPlaceholder: copy('notesPlaceholder'),
          richTextHint: copy('richTextHint'),
          selectDeck: copy('selectDeck'),
          cancel: copy('cancel'),
          save: copy('save'),
          saving: copy('saving'),
          minPlayersError: copy('minPlayersError'),
          winnerError: copy('winnerError'),
          deckError: copy('deckError'),
          dateError: copy('dateError'),
          guestBadge: copy('guestBadge'),
          deckCount: (count) =>
            `(${count} ${copy(count === 1 ? 'deckSingular' : 'deckPlural')})`,
          searchPlaceholder: copy('searchDecksPlaceholder'),
          showDeckList: copy('showDeckList'),
          hideDeckList: copy('hideDeckList'),
          selectDeckPrompt: copy('selectDeckPrompt'),
          deckListHiddenSelected: copy('deckListHiddenSelected'),
          deckListHiddenEmpty: copy('deckListHiddenEmpty'),
          noDecksMatchSearch: copy('noDecksMatchSearch'),
          swipeDecksHint: copy('swipeDecksHint'),
        }}
        onClose={() => setShowRecordModal(false)}
        onError={(message) => showAppAlert(copy('error'), message)}
        onSave={async (input) => {
          setSavingMatch(true);
          try {
            await createMatch(input);
            setShowRecordModal(false);
            void hapticSuccess();
            showToast(copy('battleRecordedHint'));
          } catch (error) {
            showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('saveMatchFailed')));
          } finally {
            setSavingMatch(false);
          }
        }}
      />

      <EditMatchModal
        visible={Boolean(editingMatch)}
        saving={savingEditMatch}
        match={editingMatch}
        members={members}
        guests={guests}
        decks={decks}
        labels={{
          title: copy('editMatchTitle'),
          hint: copy('editMatchHint'),
          selectWinner: copy('selectWinner'),
          draw: copy('liveGameDraw'),
          battleDate: copy('battleDate'),
          notes: copy('notes'),
          notesPlaceholder: copy('notesPlaceholder'),
          richTextHint: copy('richTextHint'),
          selectDeck: copy('selectDeck'),
          cancel: copy('cancel'),
          save: copy('save'),
          saving: copy('saving'),
          winnerError: copy('winnerError'),
          dateError: copy('dateError'),
          guestBadge: copy('guestBadge'),
          deckCount: (count) =>
            `(${count} ${copy(count === 1 ? 'deckSingular' : 'deckPlural')})`,
          searchPlaceholder: copy('searchDecksPlaceholder'),
          showDeckList: copy('showDeckList'),
          hideDeckList: copy('hideDeckList'),
          selectDeckPrompt: copy('selectDeckPrompt'),
          deckListHiddenSelected: copy('deckListHiddenSelected'),
          deckListHiddenEmpty: copy('deckListHiddenEmpty'),
          noDecksMatchSearch: copy('noDecksMatchSearch'),
          swipeDecksHint: copy('swipeDecksHint'),
        }}
        onClose={() => setEditingMatch(null)}
        onError={(message) => showAppAlert(copy('error'), message)}
        onSave={async (input) => {
          setSavingEditMatch(true);
          try {
            await updateMatch(input);
            setEditingMatch(null);
            void hapticSuccess();
            showToast(copy('matchUpdated'));
          } catch (error) {
            showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('saveMatchFailed')));
          } finally {
            setSavingEditMatch(false);
          }
        }}
      />

      <Modal visible={showEditModal} onClose={() => setShowEditModal(false)}>
        <Text style={styles.modalTitle}>{copy('editArenaTitle')}</Text>
        <Input label={copy('arenaName')} value={editName} onChangeText={setEditName} />
        <Input
          label={copy('arenaDescription')}
          value={editDescription}
          onChangeText={setEditDescription}
          placeholder={copy('arenaDescriptionPlaceholder')}
        />
        <View style={styles.publicRow}>
          <View style={styles.publicText}>
            <Text style={styles.publicTitle}>{copy('publicArenaProfile')}</Text>
            <Text style={styles.publicHint}>{copy('publicArenaProfileHint')}</Text>
          </View>
          <Switch
            value={editIsPublic}
            onValueChange={setEditIsPublic}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.foreground}
          />
        </View>
        <View style={styles.modalActions}>
          <Button label={copy('cancel')} variant="ghost" onPress={() => setShowEditModal(false)} style={styles.modalButton} />
          <Button
            label={savingArena ? copy('saving') : copy('saveChanges')}
            disabled={savingArena || !editName.trim()}
            onPress={handleUpdateArena}
            style={styles.modalButton}
          />
        </View>
      </Modal>

      <Modal visible={showLeaveModal} onClose={() => setShowLeaveModal(false)}>
        <Text style={styles.modalTitle}>{copy('leaveArenaTitle')}</Text>
        <Text style={styles.modalBody}>{copy('leaveArenaHint')}</Text>
        <Input
          label={copy('leaveConfirmPhrase')}
          value={leaveConfirm}
          onChangeText={setLeaveConfirm}
          placeholder={copy('leaveConfirmPlaceholder')}
          autoCapitalize="none"
        />
        <View style={styles.modalActions}>
          <Button label={copy('cancel')} variant="ghost" onPress={() => setShowLeaveModal(false)} style={styles.modalButton} />
          <Button
            label={leavingArena ? copy('saving') : copy('leaveArena')}
            disabled={leavingArena}
            onPress={handleLeaveArena}
            style={styles.modalButton}
          />
        </View>
      </Modal>

      <Modal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <Text style={[styles.modalTitle, styles.destructiveTitle]}>{copy('deleteArenaTitle')}</Text>
        <Text style={styles.modalBody}>{copy('deleteArenaHint')}</Text>
        <Text style={styles.confirmName}>{group.name}</Text>
        <Input
          label={copy('deleteArenaConfirmHint')}
          value={deleteConfirm}
          onChangeText={setDeleteConfirm}
          placeholder={group.name}
          autoCapitalize="none"
        />
        <View style={styles.modalActions}>
          <Button label={copy('cancel')} variant="ghost" onPress={() => setShowDeleteModal(false)} style={styles.modalButton} />
          <Button
            label={deletingArena ? copy('saving') : copy('deleteArena')}
            disabled={deletingArena || deleteConfirm !== group.name}
            onPress={handleDeleteArena}
            style={styles.modalButton}
          />
        </View>
      </Modal>

      <Modal visible={Boolean(exportDayKey)} onClose={closeExportModal}>
        <View style={styles.exportModalHeader}>
          <Ionicons name="download-outline" size={22} color={colors.foreground} />
          <Text style={styles.modalTitle}>{copy('exportDayTitle')}</Text>
        </View>
        {exportDayGroup ? (
          <Text style={styles.modalBody}>
            {exportDayGroup.label}
            {' · '}
            {exportDayGroup.matchCount} {copy(exportDayGroup.matchCount === 1 ? 'matchSingular' : 'matchPlural')}
          </Text>
        ) : null}
        <RichTextInput
          label={copy('exportIntro')}
          value={exportIntro}
          onChangeText={setExportIntro}
          placeholder={copy('exportIntroPlaceholder')}
          hint={copy('richTextHint')}
        />
        <View style={styles.modalActions}>
          <Button label={copy('cancel')} variant="outline" onPress={closeExportModal} style={styles.modalButton} />
          <Button label={copy('generateExport')} onPress={handleExportDayMatches} style={styles.modalButton} />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  resumePanel: {
    gap: spacing.sm,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  resumeTitle: {
    color: '#d1fae5',
    fontSize: 15,
    fontWeight: '700',
  },
  resumeHint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  exportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backLabel: {
    color: colors.primaryMuted,
    fontSize: 14,
    fontWeight: '600',
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
  modalTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '700',
  },
  destructiveTitle: {
    color: colors.destructive,
  },
  modalBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  confirmName: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '700',
  },
  publicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
  },
  publicText: {
    flex: 1,
    gap: 4,
  },
  publicTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  publicHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
  },
});
