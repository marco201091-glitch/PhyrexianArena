import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { showAppAlert } from '@/lib/app-alert';
import { AddDeckModal } from '@/components/profile/add-deck-modal';
import { DeckCard } from '@/components/profile/deck-card';
import { DeckPerformanceModal } from '@/components/profile/deck-performance-modal';
import { DeckCollectionInsights } from '@/components/profile/deck-collection-insights';
import { EditDeckModal } from '@/components/profile/edit-deck-modal';
import { Button } from '@/components/ui/button';
import { FilterPanel } from '@/components/ui/filter-panel';
import { FilterChip } from '@/components/ui/filter-chip';
import { Input } from '@/components/ui/input';
import { ManaColorFilterChip } from '@/components/ui/mana-color-filter-chip';
import { ProfileSkeleton } from '@/components/ui/screen-skeletons';

import { Screen } from '@/components/ui/screen';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useLanguage } from '@/contexts/language-context';
import { hapticSuccess } from '@/lib/haptics';
import { colors, sectionStackGap, spacing } from '@/constants/theme';
import { useAvatarVersion } from '@/contexts/avatar-version-context';
import { useProfile } from '@/hooks/use-profile';
import { useProfileDecks } from '@/hooks/use-profile-decks';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import type { CommanderMetadataOption } from '@/lib/deck-metadata';
import { getDeckDisplayColors } from '@/lib/deck-metadata';
import { MANA_COLOR_ORDER } from '@/lib/mana-colors';
import { getProfileDisplayName } from '@/lib/profile-display';
import { getSupabaseErrorMessage } from '@/lib/supabase-errors';
import type { ProfileDeck } from '@/lib/types/profile';
import { responsiveGridColumns } from '@/lib/layout';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { copy, language } = useLanguage();
  const { showToast } = useToast();
  const { version: avatarVersion } = useAvatarVersion();
  const { profile, loading: profileLoading, getAvatarUrl } = useProfile(user?.id);
  const {
    decks,
    winRates,
    performance,
    loading: decksLoading,
    refresh,
    deleteDeck,
    saveImportedDeck,
    saveManualDeck,
    refreshImportedDeck,
    refreshAllDecks,
    updateDeck,
    saveArchidektUserDecks,
    getDeckCommanderOptions,
  } = useProfileDecks(user?.id);

  const [refreshing, setRefreshing] = useState(false);
  const { scrollContentStyle } = useScreenInsets();
  const { width } = useWindowDimensions();
  const deckColumns = responsiveGridColumns(width, 290, 3, spacing.md);
  const [searchQuery, setSearchQuery] = useState('');
  const [deckColorFilter, setDeckColorFilter] = useState('all');
  const [deckSort, setDeckSort] = useState<'recent' | 'wr' | 'games' | 'damage' | 'eliminations' | 'fastest'>('recent');
  const [detailsDeck, setDetailsDeck] = useState<ProfileDeck | null>(null);
  const [refreshingAllDecks, setRefreshingAllDecks] = useState(false);
  const [showAddDeck, setShowAddDeck] = useState(false);
  const [savingDeck, setSavingDeck] = useState(false);
  const [editingDeck, setEditingDeck] = useState<ProfileDeck | null>(null);
  const [editingDeckOptions, setEditingDeckOptions] = useState<CommanderMetadataOption[]>([]);
  const [savingDeckEdit, setSavingDeckEdit] = useState(false);
  const [refreshingDeckIds, setRefreshingDeckIds] = useState<string[]>([]);

  const existingSourceUrls = useMemo(
    () => decks.map((deck) => deck.source_url).filter((url): url is string => Boolean(url)),
    [decks],
  );

  const filteredDecks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = decks.filter((deck) => {
      if (query) {
        const matchesQuery =
          deck.name.toLowerCase().includes(query) ||
          deck.commander.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      if (deckColorFilter !== 'all') {
        const colors = getDeckDisplayColors(deck);
        if (!colors.includes(deckColorFilter)) return false;
      }

      return true;
    });
    return filtered.sort((a, b) => {
      if (deckSort === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      const left = performance[a.id];
      const right = performance[b.id];
      if (deckSort === 'wr') return (right?.winRate || 0) - (left?.winRate || 0);
      if (deckSort === 'games') return (right?.gamesPlayed || 0) - (left?.gamesPlayed || 0);
      if (deckSort === 'damage') return (right?.damageDealt || 0) - (left?.damageDealt || 0);
      if (deckSort === 'eliminations') return (right?.eliminations || 0) - (left?.eliminations || 0);
      const leftDuration = left?.medianWinningDurationSeconds ?? Number.POSITIVE_INFINITY;
      const rightDuration = right?.medianWinningDurationSeconds ?? Number.POSITIVE_INFINITY;
      return leftDuration - rightDuration;
    });
  }, [deckColorFilter, deckSort, decks, performance, searchQuery]);

  const avatarUrl = getAvatarUrl(avatarVersion);

  const memberSince = useMemo(() => {
    if (!profile?.created_at) return '';
    const locale = language === 'it' ? 'it-IT' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      year: 'numeric',
    }).format(new Date(profile.created_at));
  }, [language, profile]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleDeleteDeck = useCallback((deckId: string) => {
    showAppAlert(copy('deleteDeck'), copy('deleteDeckConfirm'), [
      { text: copy('cancel'), style: 'cancel' },
      {
        text: copy('deleteDeck'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDeck(deckId);
            showToast(copy('deckDeleted'));
          } catch (error) {
            showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('saveDeckFailed')));
          }
        },
      },
    ]);
  }, [copy, deleteDeck, showToast]);

  const openEditDeck = useCallback(async (deck: ProfileDeck) => {
    setEditingDeck(deck);
    setEditingDeckOptions([]);
    const options = await getDeckCommanderOptions(deck);
    setEditingDeckOptions(options);
  }, [getDeckCommanderOptions]);

  const handleRefreshAllDecks = async () => {
    setRefreshingAllDecks(true);
    try {
      const result = await refreshAllDecks();
      if (result.skipped) {
        showAppAlert(copy('noRefreshNeeded'));
        return;
      }
      showToast(`${copy('refreshDecksDone')}: ${result.imported} imported · ${result.edhrec} EDHREC`);
    } catch (error) {
      showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('saveDeckFailed')));
    } finally {
      setRefreshingAllDecks(false);
    }
  };

  const handleRefreshDeck = useCallback(async (deck: ProfileDeck) => {
    setRefreshingDeckIds((ids) => [...ids, deck.id]);
    try {
      const update = await refreshImportedDeck(deck);
      if (!update) {
        showAppAlert(copy('deckNotRefreshed'));
        return;
      }
      showToast(`${copy('deckRefreshed')}: ${update.name}`);
    } catch (error) {
      showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('saveDeckFailed')));
    } finally {
      setRefreshingDeckIds((ids) => ids.filter((id) => id !== deck.id));
    }
  }, [copy, refreshImportedDeck, showToast]);

  const renderDeckItem = useCallback(({ item: deck }: { item: ProfileDeck }) => (
    <View style={styles.deckGridItem}>
      <DeckCard
        deck={deck}
        winRate={winRates[deck.id]}
        gamesLabel={copy('games')}
        winsLabel={copy('wins')}
        openDeckLabel={copy('openDeck')}
        viewOnEdhrecLabel={copy('viewOnEdhrec')}
        refreshing={refreshingDeckIds.includes(deck.id)}
        detailsLabel={copy('details')}
        onDetails={() => setDetailsDeck(deck)}
        onEdit={() => openEditDeck(deck)}
        onRefresh={() => handleRefreshDeck(deck)}
        onDelete={() => handleDeleteDeck(deck.id)}
      />
    </View>
  ), [copy, handleDeleteDeck, handleRefreshDeck, openEditDeck, refreshingDeckIds, winRates]);

  const listHeader = (
    <View style={styles.listHeader}>
        <PhyrexianPanel variant="strong" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <ProfileAvatar uri={avatarUrl} size="sm" />
            <View style={styles.profileMeta}>
              <Text style={styles.displayName} numberOfLines={1}>
                {getProfileDisplayName(profile)}
              </Text>
              <Text style={styles.username} numberOfLines={1}>@{profile?.username}</Text>
              {user?.email ? <Text style={styles.email} numberOfLines={1}>{user.email}</Text> : null}
              {memberSince ? (
                <Text style={styles.memberSince}>{copy('memberSince')} {memberSince}</Text>
              ) : null}
            </View>
          </View>
        </PhyrexianPanel>

        {decks.length > 0 ? (
          <DeckCollectionInsights
            decks={decks}
            language={language}
            labels={{
              avgBracket: copy('avgBracket'),
              avgCommanderCmc: copy('avgCommanderCmc'),
              decksAnalyzed: (count) =>
                `${count} ${copy(count === 1 ? 'deckAnalyzed' : 'decksAnalyzed')}`,
              details: copy('details'),
              collapse: copy('collapse'),
              mostCommonColors: copy('mostCommonColors'),
              fullColorCombos: copy('fullColorCombos'),
              sources: copy('sources'),
              bracketSpread: copy('bracketSpread'),
              avgColorsPerDeck: (value) => copy('avgColorsPerDeck').replace('{value}', String(value)),
              sourceMoxfield: copy('sourceMoxfield'),
              sourceArchidekt: copy('sourceArchidekt'),
              sourceManual: copy('sourceManual'),
              sourceOther: copy('sourceOther'),
            }}
          />
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{copy('deckArsenal')}</Text>
        </View>

        {decks.length > 0 ? (
          <FilterPanel
            actions={(
              <>
                <Button
                  label={copy('addDeck')}
                  icon="add"
                  size="sm"
                  onPress={() => setShowAddDeck(true)}
                  style={styles.panelActionButton}
                />
                <Button
                  label={refreshingAllDecks ? copy('refreshingDecks') : copy('refreshDecks')}
                  icon="refresh"
                  variant="ghost"
                  size="sm"
                  onPress={() => void handleRefreshAllDecks()}
                  disabled={refreshingAllDecks}
                  style={styles.panelActionButton}
                />
              </>
            )}
            groups={[
              {
                key: 'search',
                title: copy('searchDecks'),
                content: (
                  <Input
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={copy('searchDecksPlaceholder')}
                  />
                ),
              },
              {
                key: 'sort',
                title: copy('sortBy'),
                content: (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {([
                      ['recent', copy('recent')],
                      ['wr', copy('winRate')],
                      ['games', copy('games')],
                      ['damage', copy('damageDealt')],
                      ['eliminations', copy('eliminations')],
                      ['fastest', copy('fastestWin')],
                    ] as const).map(([value, label]) => (
                      <FilterChip key={value} label={label} active={deckSort === value} onPress={() => setDeckSort(value)} />
                    ))}
                  </ScrollView>
                ),
              },
              {
                key: 'color',
                title: copy('filterByColor'),
                content: (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    <ManaColorFilterChip
                      label={copy('allColors')}
                      active={deckColorFilter === 'all'}
                      onPress={() => setDeckColorFilter('all')}
                    />
                    {MANA_COLOR_ORDER.map((color) => (
                      <ManaColorFilterChip
                        key={color}
                        color={color}
                        active={deckColorFilter === color}
                        onPress={() => setDeckColorFilter(color)}
                      />
                    ))}
                  </ScrollView>
                ),
              },
            ]}
          />
        ) : null}

      {filteredDecks.length === 0 ? (
        <PhyrexianPanel style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{copy('noDecksTitle')}</Text>
          <Text style={styles.emptyBody}>{copy('noDecksBody')}</Text>
          <Button label={copy('addDeck')} onPress={() => setShowAddDeck(true)} />
        </PhyrexianPanel>
      ) : null}
    </View>
  );

  if (profileLoading && decksLoading && !profile) {
    return <ProfileSkeleton contentStyle={scrollContentStyle} />;
  }

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        key={`profile-decks-${deckColumns}`}
        data={filteredDecks}
        numColumns={deckColumns}
        columnWrapperStyle={deckColumns > 1 ? styles.deckGridRow : undefined}
        keyExtractor={(deck) => deck.id}
        renderItem={renderDeckItem}
        initialNumToRender={deckColumns * 2}
        maxToRenderPerBatch={deckColumns * 2}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={() => <View style={styles.deckSeparator} />}
        contentContainerStyle={scrollContentStyle}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      />

      <AddDeckModal
        visible={showAddDeck}
        saving={savingDeck}
        existingSourceUrls={existingSourceUrls}
        labels={{
          title: copy('addDeckTitle'),
          importTab: copy('importTab'),
          manualTab: copy('manualTab'),
          archidektTab: copy('archidektTab'),
          importHint: copy('importDeckHint'),
          deckUrl: copy('deckUrl'),
          deckUrlPlaceholder: copy('deckUrlPlaceholder'),
          import: copy('importDeck'),
          importing: copy('importingDeck'),
          importFailed: copy('importDeckFailed'),
          preview: copy('importPreview'),
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
          chooseCommanderToDisplay: copy('chooseCommanderToDisplay'),
          commanderRequired: copy('commanderRequired'),
          archidektUsername: copy('archidektUsername'),
          archidektUsernamePlaceholder: copy('archidektUsernamePlaceholder'),
          archidektPublicHint: copy('archidektPublicHint'),
          loadDecks: copy('loadDecks'),
          loadingDecks: copy('loadingDecks'),
          decksSelected: copy('decksSelected'),
          archidektBatchCommanderHint: copy('archidektBatchCommanderHint'),
          all: copy('all'),
          none: copy('none'),
          alreadySaved: copy('alreadySaved'),
          saveDecks: copy('saveDecks'),
          noNewDecks: copy('noNewDecks'),
          overwriteDeckTitle: copy('overwriteDeckTitle'),
          overwriteDeckMessage: copy('overwriteDeckMessage'),
          overwriteDecksTitle: copy('overwriteDecksTitle'),
          overwriteDecksMessage: copy('overwriteDecksMessage'),
          overwrite: copy('overwrite'),
          skipDuplicates: copy('skipDuplicates'),
          cancel: copy('cancel'),
          save: copy('save'),
          saving: copy('saving'),
          back: copy('back'),
        }}
        onClose={() => setShowAddDeck(false)}
        onError={(message) => showAppAlert(copy('error'), message)}
        onSaveImported={async (imported, options) => {
          setSavingDeck(true);
          try {
            const result = await saveImportedDeck(imported, options);
            if (result.inserted === 0 && result.updated === 0) {
              return result;
            }
            setShowAddDeck(false);
            void hapticSuccess();
            showToast(result.updated > 0 ? copy('deckUpdated') : copy('deckAdded'));
            return result;
          } catch (error) {
            showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('saveDeckFailed')));
            return { inserted: 0, updated: 0, skipped: 0 };
          } finally {
            setSavingDeck(false);
          }
        }}
        onSaveManual={async (input) => {
          setSavingDeck(true);
          try {
            await saveManualDeck(input);
            setShowAddDeck(false);
            void hapticSuccess();
            showToast(copy('deckCreated'));
          } catch (error) {
            showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('saveDeckFailed')));
          } finally {
            setSavingDeck(false);
          }
        }}
        onSaveArchidektBatch={async (input) => {
          setSavingDeck(true);
          try {
            const result = await saveArchidektUserDecks(input);
            if (result.inserted > 0 || result.updated > 0) {
              setShowAddDeck(false);
              void hapticSuccess();
              if (result.inserted > 0 && result.updated > 0) {
                showToast(copy('decksImportedAndUpdated')
                  .replace('{inserted}', String(result.inserted))
                  .replace('{updated}', String(result.updated)));
              } else if (result.updated > 0) {
                showToast(copy('decksUpdated').replace('{count}', String(result.updated)));
              } else {
                showToast(copy('deckAdded'));
              }
            }
            return result;
          } catch (error) {
            showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('saveDeckFailed')));
            return { inserted: 0, updated: 0, skipped: 0 };
          } finally {
            setSavingDeck(false);
          }
        }}
      />

      <EditDeckModal
        visible={Boolean(editingDeck)}
        saving={savingDeckEdit}
        deck={editingDeck}
        commanderOptions={editingDeckOptions}
        labels={{
          title: copy('editCommander'),
          commanderToDisplay: copy('commanderToDisplay'),
          chooseCommanderArt: copy('chooseCommanderArt'),
          loadingArts: copy('loadingArts'),
          noArtsFound: copy('noArtsFound'),
          printing: copy('printing'),
          saveSelectedCommander: copy('saveSelectedCommander'),
          close: copy('close'),
          saving: copy('saving'),
        }}
        onClose={() => {
          setEditingDeck(null);
          setEditingDeckOptions([]);
        }}
        onLoadOptions={getDeckCommanderOptions}
        onSave={async (input) => {
          if (!editingDeck) return;
          setSavingDeckEdit(true);
          try {
            await updateDeck(editingDeck.id, {
              commander: input.commander,
              commanderImage: input.commanderImage,
              commanderOptions: input.commanderOptions,
            });
            setEditingDeck(null);
            setEditingDeckOptions([]);
            showToast(copy('commanderUpdated'));
          } catch (error) {
            showAppAlert(copy('error'), getSupabaseErrorMessage(error, copy('saveDeckFailed')));
          } finally {
            setSavingDeckEdit(false);
          }
        }}
      />

      <DeckPerformanceModal
        visible={Boolean(detailsDeck)}
        deck={detailsDeck}
        performance={detailsDeck ? performance[detailsDeck.id] : undefined}
        onClose={() => setDetailsDeck(null)}
        labels={{
          title: copy('deckPerformance'),
          games: copy('games'),
          wins: copy('wins'),
          winRate: copy('winRate'),
          secondPlaces: copy('secondPlaces'),
          damageDealt: copy('damageDealt'),
          lifeLost: copy('lifeLost'),
          lifeGained: copy('lifeGained'),
          commanderDamage: copy('commanderDamage'),
          infectDealt: copy('infectDealt'),
          eliminations: copy('eliminations'),
          fastestWin: copy('fastestWin'),
          trackingCoverage: copy('trackingCoverage'),
        }}
      />

    </Screen>
  );
}

const styles = StyleSheet.create({
  listHeader: {
    gap: sectionStackGap,
  },
  profileCard: {
    gap: spacing.sm,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileMeta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  panelActionButton: {
    flex: 1,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 4,
  },
  displayName: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '700',
  },
  username: {
    color: colors.primaryMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  email: {
    color: colors.muted,
    fontSize: 13,
  },
  memberSince: {
    color: colors.muted,
    fontSize: 12,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '700',
  },
  deckSeparator: {
    height: 10,
  },
  deckGridRow: {
    gap: spacing.md,
  },
  deckGridItem: {
    flex: 1,
    minWidth: 0,
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
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
