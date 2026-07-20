import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ManaColorPairs, ManaColorReport } from '@/components/arena/mana-color-report';
import { DeckImage } from '@/components/deck/deck-image';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { Screen } from '@/components/ui/screen';
import { StatCard } from '@/components/ui/stat-card';
import { SharePreviewModal } from '@/components/ui/share-preview-modal';
import { useLanguage } from '@/contexts/language-context';
import { colors } from '@/constants/theme';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { apiGet } from '@/lib/api';
import { getSiteUrl } from '@/lib/env';
import { MANA_CHART_COLORS, MANA_COLOR_LABELS } from '@/lib/mana-colors';

interface PublicArenaResponse {
  arena: {
    name: string;
    description: string | null;
    inviteCode: string;
    createdAt: string;
  };
  summary: {
    totalMatches: number;
    totalPlayers: number;
  };
  topPlayers: Array<{
    displayName: string;
    gamesPlayed: number;
    wins: number;
    winRate: number;
  }>;
  topDecks: Array<{
    commander: string;
    commanderImage: string | null;
    bracket: string | null;
    gamesPlayed: number;
    wins: number;
    winRate: number;
  }>;
  topColors: Array<{
    color: string;
    label: { it: string; en: string };
    gamesPlayed: number;
    percentage: number;
    winRate: number;
  }>;
  colorMeta: {
    played: Array<{ color: string; appearances: number; wins: number; percentage: number; winRate: number }>;
    won: Array<{ color: string; appearances: number; wins: number; percentage: number; winRate: number }>;
    winRates: Array<{ color: string; appearances: number; wins: number; percentage: number; winRate: number }>;
    pairs: Array<{ key: string; colors: string[]; guildName: { it: string; en: string } | null; appearances: number; wins: number; winRate: number }>;
    missingColorGames: number;
  };
  recentMatches: Array<{
    id: string;
    playedAt: string;
    notes: string | null;
    winnerName: string;
    participants: Array<{
      displayName: string;
      commander: string | null;
      deckName: string | null;
      isWinner: boolean;
      bracket: string | null;
    }>;
  }>;
}

function formatDate(value: string, language: 'en' | 'it') {
  const locale = language === 'it' ? 'it-IT' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function PublicArenaScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const inviteCode = (Array.isArray(code) ? code[0] : code || '').toUpperCase();
  const { copy, language } = useLanguage();
  const router = useRouter();
  const [data, setData] = useState<PublicArenaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { scrollContentStyle } = useScreenInsets();
  const [error, setError] = useState<string | null>(null);
  const [sharePreview, setSharePreview] = useState<{ title: string; message: string } | null>(null);
  const [sharing, setSharing] = useState(false);

  const loadArena = useCallback(async (isRefresh = false) => {
    if (!inviteCode) {
      setLoading(false);
      setError(copy('arenaNotFound'));
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: payload, error: apiError, status } = await apiGet<PublicArenaResponse>(
        `/api/public-arena/${inviteCode}`,
      );

      if (apiError || status >= 400 || !payload?.arena) {
        throw new Error(apiError || copy('arenaNotFound'));
      }

      setData(payload);
      setError(null);
    } catch (fetchError) {
      setData(null);
      setError(fetchError instanceof Error ? fetchError.message : copy('arenaNotFound'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [copy, inviteCode]);

  useEffect(() => {
    void loadArena();
  }, [loadArena]);

  const createdLabel = useMemo(() => {
    if (!data?.arena.createdAt) return '';
    const locale = language === 'it' ? 'it-IT' : 'en-US';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(data.arena.createdAt));
  }, [data, language]);

  const openSharePreview = () => {
    if (!data) return;
    const url = `${getSiteUrl()}/arena/${data.arena.inviteCode}`;
    setSharePreview({ title: copy('copyLink'), message: url });
  };

  const confirmShare = async () => {
    if (!sharePreview) return;
    setSharing(true);
    try {
      await Share.share({ message: sharePreview.message, title: sharePreview.title });
      setSharePreview(null);
    } catch {
      // User dismissed share sheet.
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return <Loader label={copy('loading')} />;
  }

  if (error || !data) {
    return (
      <Screen safeBottom>
        <Text style={styles.title}>{copy('arenaUnavailable')}</Text>
        <Text style={styles.subtitle}>{copy('arenaUnavailableBody')}</Text>
        <Button label={copy('back')} variant="ghost" onPress={() => router.replace('/(auth)/login')} />
      </Screen>
    );
  }

  const colorLabel = (color: string) => MANA_COLOR_LABELS[color]?.[language] ?? color;

  return (
    <Screen scroll={false} safeBottom padded={false}>
      <ScrollView
        contentContainerStyle={scrollContentStyle}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadArena(true)} tintColor={colors.primary} />
        }
      >
        <Text style={styles.eyebrow}>{copy('publicArena')}</Text>
        <Text style={styles.title}>{data.arena.name}</Text>
        {data.arena.description ? (
          <Text style={styles.subtitle}>{data.arena.description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={styles.metaChip}>{data.arena.inviteCode}</Text>
          <Text style={styles.metaText}>{copy('created')} {createdLabel}</Text>
        </View>

        <Button label={copy('copyLink')} variant="ghost" onPress={openSharePreview} />

        <View style={styles.statsGrid}>
          <StatCard compact label={copy('totalGames')} value={data.summary.totalMatches} />
          <StatCard compact label={copy('players')} value={data.summary.totalPlayers} />
          <StatCard
            compact
            label={copy('leaderboard')}
            value={data.topPlayers[0]?.displayName || '—'}
            style={styles.leaderStat}
          />
        </View>

        {(data.topPlayers[0] || data.topDecks[0] || data.topColors[0]) ? (
          <View style={styles.highlightGrid}>
            {data.topPlayers[0] ? (
              <PhyrexianPanel style={styles.highlightCard}>
                <Text style={styles.highlightLabel}>{copy('currentLeader')}</Text>
                <Text style={styles.highlightValue}>{data.topPlayers[0].displayName}</Text>
                <Text style={styles.highlightHint}>
                  {data.topPlayers[0].winRate}% · {data.topPlayers[0].wins}W / {data.topPlayers[0].gamesPlayed}G
                </Text>
              </PhyrexianPanel>
            ) : null}
            {data.topDecks[0] ? (
              <PhyrexianPanel style={styles.highlightCard}>
                <Text style={styles.highlightLabel}>{copy('topDeckHighlight')}</Text>
                <View style={styles.deckRow}>
                  <DeckImage
                    uri={data.topDecks[0].commanderImage}
                    alt={data.topDecks[0].commander}
                    style={styles.deckImage}
                    containerStyle={styles.deckImage}
                  />
                  <View style={styles.deckInfo}>
                    <Text style={styles.highlightValue}>{data.topDecks[0].commander}</Text>
                    <Text style={styles.highlightHint}>
                      {data.topDecks[0].winRate}% · {data.topDecks[0].wins}W / {data.topDecks[0].gamesPlayed}G
                    </Text>
                  </View>
                </View>
              </PhyrexianPanel>
            ) : null}
            {data.topColors[0] ? (
              <PhyrexianPanel style={styles.highlightCard}>
                <Text style={styles.highlightLabel}>{copy('dominantColor')}</Text>
                <View style={styles.colorRow}>
                  <View style={[styles.colorDot, { backgroundColor: MANA_CHART_COLORS[data.topColors[0].color] || colors.muted }]} />
                  <Text style={styles.highlightValue}>{colorLabel(data.topColors[0].color)}</Text>
                </View>
                <Text style={styles.highlightHint}>
                  {data.topColors[0].percentage}% {copy('ofMeta')} · {data.topColors[0].winRate}% WR
                </Text>
              </PhyrexianPanel>
            ) : null}
          </View>
        ) : null}

        <PhyrexianPanel style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{copy('topPlayers')}</Text>
          {data.topPlayers.map((player, index) => (
            <View key={`${player.displayName}-${index}`} style={styles.listRow}>
              <Text style={styles.rank}>{index + 1}</Text>
              <Text style={styles.listPrimary}>{player.displayName}</Text>
              <Text style={styles.listSecondary}>
                {player.winRate}% · {player.wins}W / {player.gamesPlayed}G
              </Text>
            </View>
          ))}
        </PhyrexianPanel>

        <PhyrexianPanel style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{copy('topDecks')}</Text>
          {data.topDecks.map((deck, index) => (
            <View key={`${deck.commander}-${index}`} style={styles.deckListRow}>
              <DeckImage
                uri={deck.commanderImage}
                alt={deck.commander}
                style={styles.deckThumb}
                containerStyle={styles.deckThumb}
              />
              <View style={styles.deckInfo}>
                <Text style={styles.listPrimary}>{deck.commander}</Text>
                <Text style={styles.listSecondary}>
                  {deck.winRate}% · {deck.wins}W / {deck.gamesPlayed}G
                </Text>
              </View>
            </View>
          ))}
        </PhyrexianPanel>

        {data.colorMeta?.played?.length ? (
          <PhyrexianPanel style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{copy('colorMeta')}</Text>
            <Text style={styles.sectionHint}>{copy('colorMetaHint')}</Text>
            <ManaColorReport
              played={data.colorMeta.played}
              won={data.colorMeta.won}
              winRates={data.colorMeta.winRates}
              missingColorGames={data.colorMeta.missingColorGames}
              language={language}
              labels={{
                colors: copy('colorLabel'),
                sort: copy('sortBy'),
                color: copy('colorLabel'),
                appearances: copy('appearances'),
                wins: copy('wins'),
                winRate: copy('winRate'),
                noGamesInPeriod: copy('noGamesInPeriod'),
                minThreeGames: copy('minThreeGames'),
                emptyLabel: copy('noColorsResolved'),
                missingColorGames: (count) => `${count} ${copy('missingColorGames')}`,
              }}
            />
            {data.colorMeta.pairs.length > 0 ? (
              <View style={styles.pairsSection}>
                <Text style={styles.sectionSubtitle}>{copy('multicolorIdentities')}</Text>
                <Text style={styles.sectionHint}>{copy('multicolorIdentitiesHint')}</Text>
                <ManaColorPairs
                  pairs={data.colorMeta.pairs}
                  language={language}
                  labels={{
                    emptyLabel: copy('noMulticolorIdentities'),
                    pairsHint: copy('multicolorPairsHint'),
                    pentacolor: copy('pentacolor'),
                  }}
                />
              </View>
            ) : null}
          </PhyrexianPanel>
        ) : data.topColors.length > 0 ? (
          <PhyrexianPanel style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{copy('colorMeta')}</Text>
            <View style={styles.colorChips}>
              {data.topColors.map((entry) => (
                <View key={entry.color} style={styles.colorChip}>
                  <View style={[styles.colorDot, { backgroundColor: MANA_CHART_COLORS[entry.color] || colors.muted }]} />
                  <Text style={styles.colorChipText}>
                    {colorLabel(entry.color)} · {entry.percentage}%
                  </Text>
                </View>
              ))}
            </View>
          </PhyrexianPanel>
        ) : null}

        <PhyrexianPanel style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{copy('recentMatches')}</Text>
          {data.recentMatches.map((match) => (
            <View key={match.id} style={styles.matchCard}>
              <Text style={styles.matchDate}>{formatDate(match.playedAt, language)}</Text>
              <Text style={styles.matchWinner}>
                {copy('winner')}: <Text style={styles.winnerName}>{match.winnerName}</Text>
              </Text>
              <View style={styles.participantsRow}>
                {match.participants.map((participant, index) => (
                  <Text
                    key={`${match.id}-${participant.displayName}-${index}`}
                    style={[styles.participantChip, participant.isWinner && styles.participantWinner]}
                  >
                    {participant.displayName}
                    {participant.commander ? ` (${participant.commander})` : ''}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </PhyrexianPanel>

        <Button label={copy('login')} onPress={() => router.push('/(auth)/login')} />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.primaryMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  metaChip: {
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontWeight: '700',
  },
  metaText: {
    color: colors.muted,
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 10,
  },
  leaderStat: {
    flexGrow: 1,
    minWidth: '30%',
  },
  highlightGrid: {
    gap: 10,
  },
  highlightCard: {
    gap: 6,
  },
  highlightLabel: {
    color: colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  highlightValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '700',
  },
  highlightHint: {
    color: colors.muted,
    fontSize: 13,
  },
  deckRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  deckImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  deckInfo: {
    flex: 1,
    gap: 4,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  sectionCard: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
  },
  pairsSection: {
    marginTop: 16,
    gap: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deckListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deckThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.primarySurface,
    color: colors.primaryForeground,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '700',
  },
  listPrimary: {
    flex: 1,
    color: colors.foreground,
    fontWeight: '600',
  },
  listSecondary: {
    color: colors.muted,
    fontSize: 12,
  },
  colorChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  colorChipText: {
    color: colors.foreground,
    fontSize: 12,
  },
  matchCard: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  matchDate: {
    color: colors.muted,
    fontSize: 12,
  },
  matchWinner: {
    color: colors.muted,
    fontSize: 14,
  },
  winnerName: {
    color: colors.primaryMuted,
    fontWeight: '700',
  },
  participantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  participantChip: {
    backgroundColor: colors.surfaceChip,
    color: colors.foreground,
    fontSize: 11,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  participantWinner: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
    color: colors.primaryForeground,
  },
});
