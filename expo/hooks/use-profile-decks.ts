import { useCallback, useEffect, useState } from 'react';
import { apiPost } from '@/lib/api';
import { isImportedDeckSource } from '@/lib/deck-importers';
import { prefetchEdhrecStats } from '@/lib/edhrec-client';
import {
  buildPairedCommanderColorFields,
  buildPairedCommanderName,
} from '@/lib/commander-partners';
import type { CommanderSearchResult } from '@/lib/commander-types';
import {
  deckDataToColorFields,
  getDefaultImportedCommanderOption,
  resolveImportedDeckCommanderImage,
  type CommanderOption,
  type ImportedDeckPreview,
} from '@/lib/deck-importers';
import { fetchCommanderArtOptions } from '@/lib/commander-arts';
import {
  filterSelectableCommanderOptions,
  getCommanderOptions,
  mergeDeckColorFields,
  type CommanderMetadataOption,
} from '@/lib/deck-metadata';
import {
  buildPersonalAnalytics,
  type PersonalDeckSnapshot,
  type PersonalMatchParticipantRow,
} from '@/lib/personal-analytics';
import { getDeckDisplayColors } from '@/lib/deck-metadata';
import { getSupabaseErrorMessage } from '@/lib/supabase-errors';
import { supabase } from '@/lib/supabase';
import { prefetchProfileDeckImages } from '@/lib/deck-image-cache';
import type { DeckWinRate, ProfileDeck } from '@/lib/types/profile';

function uniqueCommanderOptions(options: CommanderMetadataOption[]) {
  return options.filter((option, index, allOptions) =>
    option.name &&
    allOptions.findIndex((candidate) => candidate.name.toLowerCase() === option.name.toLowerCase()) === index
  );
}

export function useProfileDecks(userId: string | undefined) {
  const [decks, setDecks] = useState<ProfileDeck[]>([]);
  const [winRates, setWinRates] = useState<Record<string, DeckWinRate>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setDecks([]);
      setWinRates({});
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: deckRows, error: deckError } = await supabase
        .from('decks')
        .select('*')
        .is('group_id', null)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (deckError) throw deckError;

      const loadedDecks = (deckRows as ProfileDeck[]) || [];
      setDecks(loadedDecks);
      prefetchProfileDeckImages(loadedDecks);

      const deckIds = loadedDecks.map((deck) => deck.id);
      if (deckIds.length === 0) {
        setWinRates({});
        return;
      }

      const { data: participantRows, error: participantsError } = await supabase
        .from('match_participants')
        .select('is_winner, deck_id')
        .in('deck_id', deckIds);

      if (participantsError) throw participantsError;

      const participants = (participantRows as PersonalMatchParticipantRow[]) || [];
      const decksById = new Map<string, PersonalDeckSnapshot>(
        loadedDecks.map((deck) => [deck.id, {
          id: deck.id,
          name: deck.name,
          commander: deck.commander,
          commander_image: deck.commander_image,
          color_identity: deck.color_identity,
          source_type: deck.source_type,
          source_url: deck.source_url,
        }]),
      );
      const colorOverrides = new Map<string, string[]>();
      loadedDecks.forEach((deck) => {
        const colors = getDeckDisplayColors(deck);
        if (colors.length > 0) colorOverrides.set(deck.id, colors);
      });

      const analytics = buildPersonalAnalytics(participants, decksById, colorOverrides);
      const nextWinRates: Record<string, DeckWinRate> = {};
      analytics.topDecks.forEach((deck) => {
        nextWinRates[deck.id] = {
          gamesPlayed: deck.gamesPlayed,
          wins: deck.wins,
          winRate: deck.winRate,
        };
      });
      setWinRates(nextWinRates);
    } catch (error) {
      console.error('Error fetching decks:', getSupabaseErrorMessage(error, 'Failed to fetch decks'));
      setDecks([]);
      setWinRates({});
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteDeck = useCallback(async (deckId: string) => {
    const { error } = await supabase.from('decks').delete().eq('id', deckId);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const saveImportedDeck = useCallback(async (
    imported: ImportedDeckPreview,
    options?: {
      selectedCommander?: CommanderOption | null;
      deckName?: string;
      overwrite?: boolean;
    },
  ) => {
    if (!userId) throw new Error('Not authenticated');

    const existingDeck = decks.find((deck) => deck.source_url === imported.sourceUrl);
    if (existingDeck && !options?.overwrite) {
      return { inserted: 0, updated: 0, skipped: 1 };
    }

    const selectedCommander = options?.selectedCommander || getDefaultImportedCommanderOption(imported);
    let commanderImage = resolveImportedDeckCommanderImage(
      selectedCommander,
      imported,
      { preserveImage: existingDeck?.commander_image },
    );
    if (!commanderImage) {
      const arts = await fetchCommanderArtOptions(selectedCommander.name);
      commanderImage = arts[0]?.imageUrl?.trim() || null;
    }
    const commander = (imported.commanderOptions?.length || 0) > 1
      ? imported.commander
      : selectedCommander.name;
    const colorFields = deckDataToColorFields({
      commanderOptions: imported.commanderOptions || [],
      colorIdentity: imported.colorIdentity || [],
    });
    const payload = {
      name: options?.deckName?.trim() || imported.name,
      commander,
      commander_image: commanderImage,
      source_url: imported.sourceUrl,
      source_type: imported.sourceType,
      bracket: imported.bracket,
      ...colorFields,
    };

    if (existingDeck) {
      const { error } = await supabase
        .from('decks')
        .update(payload)
        .eq('id', existingDeck.id);

      if (error) throw error;
      await refresh();
      return { inserted: 0, updated: 1, skipped: 0 };
    }

    const { error } = await supabase.from('decks').insert({
      user_id: userId,
      group_id: null,
      ...payload,
    });

    if (error) throw error;
    await refresh();
    return { inserted: 1, updated: 0, skipped: 0 };
  }, [decks, refresh, userId]);

  const saveManualDeck = useCallback(async (input: {
    commander: CommanderSearchResult;
    partnerCommander?: CommanderSearchResult | null;
    deckName?: string;
    selectedArtUrl?: string | null;
  }) => {
    if (!userId) throw new Error('Not authenticated');

    const commanderDisplayName = buildPairedCommanderName(input.commander, input.partnerCommander);
    const colorFields = buildPairedCommanderColorFields(input.commander, input.partnerCommander);
    const commanderImage = input.selectedArtUrl ?? input.commander.imageUrl;

    const { error } = await supabase.from('decks').insert({
      user_id: userId,
      group_id: null,
      name: input.deckName?.trim() || commanderDisplayName,
      commander: commanderDisplayName,
      commander_image: commanderImage,
      source_url: null,
      source_type: 'manual',
      bracket: null,
      ...colorFields,
    });

    if (error) throw error;
    await refresh();
  }, [refresh, userId]);

  const refreshImportedDeck = useCallback(async (deck: ProfileDeck) => {
    if (deck.source_type === 'manual' || !deck.source_url) return null;

    const { data, error, status } = await apiPost<ImportedDeckPreview & { error?: string }>(
      '/api/deck-import',
      { url: deck.source_url },
    );

    if (status !== 200 || error || !data?.name) return null;

    const importedCommanderOptions = data.commanderOptions || [];
    const currentCommanderStillAvailable = importedCommanderOptions.some((option) =>
      option.name.toLowerCase() === deck.commander.toLowerCase()
    );
    const refreshedCommander = currentCommanderStillAvailable
      ? deck.commander
      : data.commander || deck.commander;
    const refreshedCommanderOption = importedCommanderOptions.find((option) =>
      option.name.toLowerCase() === refreshedCommander.toLowerCase()
    );
    const colorFields = deckDataToColorFields({
      commanderOptions: importedCommanderOptions,
      colorIdentity: data.colorIdentity || [],
    });
    const refreshedDeck = {
      name: data.name || deck.name,
      commander: refreshedCommander,
      commander_image: currentCommanderStillAvailable
        ? deck.commander_image || refreshedCommanderOption?.imageUrl || data.commanderImageUrl || null
        : refreshedCommanderOption?.imageUrl || data.commanderImageUrl || deck.commander_image,
      bracket: typeof data.bracket === 'string' ? data.bracket : null,
      ...colorFields,
    };

    const { error: updateError } = await supabase
      .from('decks')
      .update(refreshedDeck)
      .eq('id', deck.id);

    if (updateError) return null;
    return { id: deck.id, ...refreshedDeck };
  }, []);

  const updateDeck = useCallback(async (
    deckId: string,
    input: {
      commander: string;
      commanderImage: string | null;
      commanderOptions: CommanderMetadataOption[];
    },
  ) => {
    const deck = decks.find((entry) => entry.id === deckId);
    if (!deck) throw new Error('Deck not found');

    const colorFields = mergeDeckColorFields(deck, input.commanderOptions);
    const { error } = await supabase
      .from('decks')
      .update({
        commander: input.commander,
        commander_image: input.commanderImage,
        ...colorFields,
      })
      .eq('id', deckId);

    if (error) throw error;
    await refresh();
  }, [decks, refresh]);

  const saveArchidektUserDecks = useCallback(async (input: {
    decks: ImportedDeckPreview[];
    selectedUrls: string[];
    selectedCommanders: Record<string, CommanderOption>;
    overwriteExisting?: boolean;
  }) => {
    if (!userId) throw new Error('Not authenticated');

    const existingByUrl = new Map(
      decks
        .filter((deck) => deck.source_url)
        .map((deck) => [deck.source_url as string, deck]),
    );

    const selectedDecks = input.decks.filter((deck) => input.selectedUrls.includes(deck.sourceUrl));
    const decksToInsert: Array<Record<string, unknown>> = [];
    const decksToUpdate: Array<{ id: string; payload: Record<string, unknown> }> = [];

    for (const deck of selectedDecks) {
      const selectedCommander = input.selectedCommanders[deck.sourceUrl] || getDefaultImportedCommanderOption(deck);
      const colorFields = deckDataToColorFields({
        commanderOptions: deck.commanderOptions || [],
        colorIdentity: deck.colorIdentity || [],
      });
      const existingDeck = existingByUrl.get(deck.sourceUrl);
      let commanderImage = resolveImportedDeckCommanderImage(
        selectedCommander,
        deck,
        { preserveImage: existingDeck?.commander_image },
      );
      if (!commanderImage) {
        const arts = await fetchCommanderArtOptions(selectedCommander.name);
        commanderImage = arts[0]?.imageUrl?.trim() || null;
      }
      const payload = {
        name: deck.name,
        commander: selectedCommander.name,
        commander_image: commanderImage,
        source_url: deck.sourceUrl,
        source_type: deck.sourceType,
        bracket: deck.bracket,
        ...colorFields,
      };
      if (existingDeck) {
        if (input.overwriteExisting) {
          decksToUpdate.push({ id: existingDeck.id, payload });
        }
        continue;
      }

      decksToInsert.push({
        user_id: userId,
        group_id: null,
        ...payload,
      });
    }

    if (decksToInsert.length === 0 && decksToUpdate.length === 0) {
      return { inserted: 0, updated: 0, skipped: selectedDecks.length };
    }

    if (decksToInsert.length > 0) {
      const { error } = await supabase.from('decks').insert(decksToInsert);
      if (error) throw error;
    }

    for (const deckUpdate of decksToUpdate) {
      const { error } = await supabase
        .from('decks')
        .update(deckUpdate.payload)
        .eq('id', deckUpdate.id);
      if (error) throw error;
    }

    await refresh();
    return {
      inserted: decksToInsert.length,
      updated: decksToUpdate.length,
      skipped: selectedDecks.length - decksToInsert.length - decksToUpdate.length,
    };
  }, [decks, refresh, userId]);

  const refreshAllDecks = useCallback(async () => {
    const decksToRefresh = decks.filter(
      (deck) => isImportedDeckSource(deck.source_type) && Boolean(deck.source_url),
    );

    if (decksToRefresh.length === 0) {
      return { imported: 0, edhrec: 0, rateLimited: false, skipped: true };
    }

    let imported = 0;
    let edhrec = 0;
    let rateLimited = false;

    for (const deck of decksToRefresh) {
      const { status } = await apiPost<{ ok?: boolean }>('/api/profile/deck-refresh-budget', {});
      if (status !== 200) {
        rateLimited = true;
        break;
      }

      const update = await refreshImportedDeck(deck);
      if (update) imported += 1;

      const commander = update?.commander || deck.commander;
      if (commander?.trim()) {
        const stats = await prefetchEdhrecStats(commander);
        if (stats) edhrec += 1;
      }
    }

    await refresh();
    return { imported, edhrec, rateLimited, skipped: false };
  }, [decks, refresh, refreshImportedDeck]);

  const getDeckCommanderOptions = useCallback(async (deck: ProfileDeck): Promise<CommanderMetadataOption[]> => {
    const currentCommander = { name: deck.commander, imageUrl: deck.commander_image };
    const storedOptions = getCommanderOptions(deck);
    if (storedOptions.length > 0) {
      return filterSelectableCommanderOptions(uniqueCommanderOptions([currentCommander, ...storedOptions]));
    }

    if (deck.source_type !== 'manual' && deck.source_url) {
      try {
        const { data, status } = await apiPost<ImportedDeckPreview & { error?: string }>(
          '/api/deck-import',
          { url: deck.source_url },
        );
        if (status === 200 && data?.commanderOptions?.length) {
          return filterSelectableCommanderOptions(uniqueCommanderOptions([currentCommander, ...data.commanderOptions]));
        }
      } catch {
        // Fall back to current commander only.
      }
    }

    return filterSelectableCommanderOptions([currentCommander]);
  }, []);

  return {
    decks,
    winRates,
    loading,
    refresh,
    deleteDeck,
    saveImportedDeck,
    saveManualDeck,
    refreshImportedDeck,
    refreshAllDecks,
    updateDeck,
    saveArchidektUserDecks,
    getDeckCommanderOptions,
  };
}