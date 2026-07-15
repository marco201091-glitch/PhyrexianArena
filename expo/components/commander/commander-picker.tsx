import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DeckImage } from '@/components/deck/deck-image';
import { Input } from '@/components/ui/input';
import { colors } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useCommanderArts } from '@/hooks/use-commander-arts';
import { useCommanderSearch } from '@/hooks/use-commander-search';
import {
  buildPairedCommanderName,
  getCommanderPartnerCopy,
  getCommanderPartnerMode,
} from '@/lib/commander-partners';
import type { CommanderArtOption, CommanderSearchResult } from '@/lib/commander-types';

export type CommanderPickerLabels = {
  deckName: string;
  deckNamePlaceholder: string;
  searchCommander: string;
  searchPlaceholder: string;
  searching: string;
  noResults: string;
  selectedCommander: string;
  partnerHint: string;
  chooseCommanderArt: string;
  loadingArts: string;
  noArtsFound: string;
  printing: string;
};

type CommanderPickerProps = {
  deckName: string;
  onDeckNameChange: (value: string) => void;
  selectedCommander: CommanderSearchResult | null;
  onSelectCommander: (commander: CommanderSearchResult | null) => void;
  selectedPartnerCommander: CommanderSearchResult | null;
  onSelectPartnerCommander: (commander: CommanderSearchResult | null) => void;
  selectedArtUrl?: string | null;
  onSelectArtUrl?: (url: string | null) => void;
  disabled?: boolean;
  showDeckName?: boolean;
  labels: CommanderPickerLabels;
};

export function CommanderPicker({
  deckName,
  onDeckNameChange,
  selectedCommander,
  onSelectCommander,
  selectedPartnerCommander,
  onSelectPartnerCommander,
  selectedArtUrl,
  onSelectArtUrl,
  disabled = false,
  showDeckName = true,
  labels,
}: CommanderPickerProps) {
  const { language } = useLanguage();
  const bilingual = useCallback(
    (value: { it: string; en: string }) => (language === 'it' ? value.it : value.en),
    [language],
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');

  const partnerMode = selectedCommander ? getCommanderPartnerMode(selectedCommander) : null;
  const partnerCopy = partnerMode ? getCommanderPartnerCopy(partnerMode, bilingual) : null;

  const { results, searching } = useCommanderSearch(searchQuery);
  const { results: partnerResults, searching: searchingPartner } = useCommanderSearch(
    partnerMode ? partnerSearchQuery : '',
    partnerMode,
  );
  const { arts, loading: loadingArts } = useCommanderArts(
    selectedCommander && onSelectArtUrl ? selectedCommander.name : null,
  );

  const activeArtUrl = useMemo(() => {
    if (selectedArtUrl) return selectedArtUrl;
    return selectedCommander?.imageUrl ?? null;
  }, [selectedArtUrl, selectedCommander?.imageUrl]);

  useEffect(() => {
    if (!partnerMode || !selectedCommander) {
      setPartnerSearchQuery('');
    }
  }, [partnerMode, selectedCommander]);

  const handleSelectCommander = (commander: CommanderSearchResult) => {
    onSelectCommander(commander);
    onSelectPartnerCommander(null);
    onSelectArtUrl?.(null);
    setPartnerSearchQuery('');
    if (!deckName || deckName === selectedCommander?.name) {
      onDeckNameChange(commander.name);
    }
  };

  const handleSelectPartner = (partner: CommanderSearchResult) => {
    if (!selectedCommander) return;
    onSelectPartnerCommander(partner);
    setPartnerSearchQuery(partner.name);
    const combinedName = buildPairedCommanderName(selectedCommander, partner);
    if (
      !deckName ||
      deckName === selectedCommander.name ||
      deckName === buildPairedCommanderName(selectedCommander, selectedPartnerCommander)
    ) {
      onDeckNameChange(combinedName);
    }
  };

  const clearPartner = () => {
    if (!selectedCommander) return;
    onSelectPartnerCommander(null);
    setPartnerSearchQuery('');
    if (deckName === buildPairedCommanderName(selectedCommander, selectedPartnerCommander)) {
      onDeckNameChange(selectedCommander.name);
    }
  };

  const handleSelectArt = (art: CommanderArtOption) => {
    onSelectArtUrl?.(art.imageUrl);
  };

  return (
    <View style={styles.container}>
      {showDeckName ? (
        <Input
          label={labels.deckName}
          value={deckName}
          onChangeText={onDeckNameChange}
          placeholder={labels.deckNamePlaceholder}
          editable={!disabled}
        />
      ) : null}

      <Input
        label={labels.searchCommander}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={labels.searchPlaceholder}
        autoCapitalize="words"
        editable={!disabled}
      />

      {searching ? (
        <View style={styles.searchingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.muted}>{labels.searching}</Text>
        </View>
      ) : null}

      {!searching && results.length > 0 && !selectedCommander ? (
        <ScrollView style={styles.resultsScroll} nestedScrollEnabled keyboardShouldPersistTaps="always" keyboardDismissMode="none">
          <View style={styles.results}>
            {results.map((commander) => (
              <Pressable
                key={commander.id}
                style={styles.resultRow}
                disabled={disabled}
                onPress={() => handleSelectCommander(commander)}
              >
                <DeckImage
                  uri={commander.imageUrl}
                  alt={commander.name}
                  style={styles.resultImage}
                  containerStyle={styles.resultImage}
                />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName} numberOfLines={1}>{commander.name}</Text>
                  <Text style={styles.resultMeta} numberOfLines={1}>{commander.typeLine}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {!selectedCommander && searchQuery.trim().length >= 2 && !searching && results.length === 0 ? (
        <Text style={styles.muted}>{labels.noResults}</Text>
      ) : null}

      {selectedCommander ? (
        <View style={styles.selectedCard}>
          <Text style={styles.selectedLabel}>{labels.selectedCommander}</Text>
          <View style={styles.selectedRow}>
            <DeckImage
              uri={activeArtUrl || selectedCommander.imageUrl}
              alt={selectedCommander.name}
              style={styles.selectedImage}
              containerStyle={styles.selectedImage}
            />
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{selectedCommander.name}</Text>
              <Text style={styles.resultMeta}>{selectedCommander.typeLine}</Text>
            </View>
            <Pressable
              disabled={disabled}
              onPress={() => {
                onSelectCommander(null);
                onSelectPartnerCommander(null);
                onSelectArtUrl?.(null);
                setSearchQuery('');
                setPartnerSearchQuery('');
              }}
            >
              <Text style={styles.clearButton}>✕</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {partnerMode && partnerCopy && selectedCommander ? (
        <View style={styles.partnerSection}>
          <Text style={styles.partnerTitle}>{partnerCopy.title}</Text>
          <Text style={styles.muted}>{labels.partnerHint}</Text>

          {selectedPartnerCommander ? (
            <View style={styles.partnerSelected}>
              <DeckImage
                uri={selectedPartnerCommander.imageUrl}
                alt={selectedPartnerCommander.name}
                style={styles.partnerImage}
                containerStyle={styles.partnerImage}
              />
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{selectedPartnerCommander.name}</Text>
                <Text style={styles.resultMeta}>{selectedPartnerCommander.typeLine}</Text>
              </View>
              <Pressable disabled={disabled} onPress={clearPartner}>
                <Text style={styles.clearButton}>✕</Text>
              </Pressable>
            </View>
          ) : null}

          <Input
            label={partnerCopy.title}
            value={partnerSearchQuery}
            onChangeText={setPartnerSearchQuery}
            placeholder={partnerCopy.placeholder}
            autoCapitalize="words"
            editable={!disabled}
          />

          {searchingPartner ? (
            <View style={styles.searchingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.muted}>{labels.searching}</Text>
            </View>
          ) : null}

          {partnerResults.length > 0 ? (
            <ScrollView style={styles.partnerResultsScroll} nestedScrollEnabled keyboardShouldPersistTaps="always" keyboardDismissMode="none">
              <View style={styles.results}>
                {partnerResults.map((result) => (
                  <Pressable
                    key={result.id}
                    style={styles.resultRow}
                    disabled={disabled}
                    onPress={() => handleSelectPartner(result)}
                  >
                    <DeckImage
                      uri={result.imageUrl}
                      alt={result.name}
                      style={styles.partnerImage}
                      containerStyle={styles.partnerImage}
                    />
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{result.name}</Text>
                      <Text style={styles.resultMeta}>{result.typeLine}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : null}

          {!searchingPartner && partnerSearchQuery.length >= 2 && partnerResults.length === 0 ? (
            <Text style={styles.muted}>{partnerCopy.empty}</Text>
          ) : null}
        </View>
      ) : null}

      {selectedCommander && onSelectArtUrl ? (
        <View style={styles.artSection}>
          <Text style={styles.partnerTitle}>{labels.chooseCommanderArt}</Text>
          {loadingArts ? (
            <View style={styles.searchingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.muted}>{labels.loadingArts}</Text>
            </View>
          ) : arts.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artRow}>
              {arts.map((art) => {
                const selected = activeArtUrl === art.imageUrl;
                return (
                  <Pressable
                    key={`${art.id}-${art.imageUrl}`}
                    style={[styles.artCard, selected && styles.artCardSelected]}
                    disabled={disabled}
                    onPress={() => handleSelectArt(art)}
                  >
                    <DeckImage
                      uri={art.imageUrl}
                      alt={art.name}
                      style={styles.artImage}
                      containerStyle={styles.artImage}
                    />
                    <Text style={styles.artSetName} numberOfLines={1}>
                      {art.setName || labels.printing}
                    </Text>
                    {(art.collectorNumber || art.releasedAt) ? (
                      <Text style={styles.artMeta} numberOfLines={1}>
                        {[art.collectorNumber, art.releasedAt].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.muted}>{labels.noArtsFound}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
  },
  resultsScroll: {
    maxHeight: 200,
  },
  partnerResultsScroll: {
    maxHeight: 180,
  },
  results: {
    gap: 6,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  resultImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    color: colors.foreground,
    fontWeight: '600',
    fontSize: 14,
  },
  resultMeta: {
    color: colors.muted,
    fontSize: 11,
  },
  selectedCard: {
    backgroundColor: colors.primarySurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    padding: 12,
    gap: 8,
  },
  selectedLabel: {
    color: colors.primaryForeground,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  clearButton: {
    color: colors.muted,
    fontSize: 18,
    padding: 4,
  },
  partnerSection: {
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 12,
  },
  partnerTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  partnerSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    padding: 8,
  },
  partnerImage: {
    width: 48,
    height: 64,
    borderRadius: 6,
  },
  artSection: {
    gap: 8,
  },
  artRow: {
    gap: 10,
    paddingVertical: 4,
  },
  artCard: {
    width: 132,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 8,
    gap: 4,
  },
  artCardSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primarySurface,
  },
  artImage: {
    width: '100%',
    height: 96,
    borderRadius: 6,
  },
  artSetName: {
    color: colors.foreground,
    fontSize: 11,
    fontWeight: '600',
  },
  artMeta: {
    color: colors.muted,
    fontSize: 10,
  },
});
