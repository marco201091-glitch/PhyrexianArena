import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ManaColorPairs, ManaColorReport } from '@/components/arena/mana-color-report';
import { PhyrexianPanel } from '@/components/ui/phyrexian-panel';
import { colors } from '@/constants/theme';
import type { ArenaColorAnalytics } from '@/lib/arena-color-analytics';
import type { AppLanguage } from '@/lib/i18n/types';

type TableMetaTabProps = {
  filteredMatchCount: number;
  colorAnalytics: ArenaColorAnalytics;
  language: AppLanguage;
  labels: {
    noMetaDataTitle: string;
    noMetaDataBody: string;
    missingColorGames: string;
    colorMeta: string;
    colorMetaHint: string;
    multicolorIdentities: string;
    multicolorIdentitiesHint: string;
    colorLabel: string;
    sortBy: string;
    appearances: string;
    wins: string;
    winRate: string;
    noGamesInPeriod: string;
    minThreeGames: string;
    noColorsResolved: string;
    noMulticolorIdentities: string;
    multicolorPairsHint: string;
    pentacolor: string;
  };
};

export function TableMetaTab({
  filteredMatchCount,
  colorAnalytics,
  language,
  labels,
}: TableMetaTabProps) {
  if (filteredMatchCount === 0) {
    return (
      <PhyrexianPanel style={styles.emptyCard}>
        <Ionicons name="color-palette-outline" size={36} color={colors.muted} />
        <Text style={styles.emptyTitle}>{labels.noMetaDataTitle}</Text>
        <Text style={styles.emptyBody}>{labels.noMetaDataBody}</Text>
      </PhyrexianPanel>
    );
  }

  return (
    <View style={styles.section}>
      {colorAnalytics.missingColorGames > 0 ? (
        <Text style={styles.warningText}>
          {colorAnalytics.missingColorGames} {labels.missingColorGames}
        </Text>
      ) : null}

      <PhyrexianPanel style={styles.metaCard}>
        <Text style={styles.sectionTitle}>{labels.colorMeta}</Text>
        <Text style={styles.metaHint}>{labels.colorMetaHint}</Text>
        <ManaColorReport
          played={colorAnalytics.played}
          won={colorAnalytics.won}
          winRates={colorAnalytics.winRates}
          missingColorGames={colorAnalytics.missingColorGames}
          language={language}
          labels={{
            colors: labels.colorLabel,
            sort: labels.sortBy,
            color: labels.colorLabel,
            appearances: labels.appearances,
            wins: labels.wins,
            winRate: labels.winRate,
            noGamesInPeriod: labels.noGamesInPeriod,
            minThreeGames: labels.minThreeGames,
            emptyLabel: labels.noColorsResolved,
            missingColorGames: (count) => `${count} ${labels.missingColorGames}`,
          }}
        />
      </PhyrexianPanel>

      <PhyrexianPanel style={styles.metaCard}>
        <Text style={styles.sectionTitle}>{labels.multicolorIdentities}</Text>
        <Text style={styles.metaHint}>{labels.multicolorIdentitiesHint}</Text>
        <ManaColorPairs
          pairs={colorAnalytics.pairs}
          language={language}
          labels={{
            emptyLabel: labels.noMulticolorIdentities,
            pairsHint: labels.multicolorPairsHint,
            pentacolor: labels.pentacolor,
          }}
        />
      </PhyrexianPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  metaCard: {
    gap: 10,
  },
  metaHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  warningText: {
    color: colors.amber,
    fontSize: 12,
    lineHeight: 17,
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