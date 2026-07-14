'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeckImage } from '@/components/deck-image';
import { useLanguage } from '@/components/language-provider';
import { getCommanderPartnerCopy, getCommanderPartnerMode } from '@/lib/commander-partners';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import type { CommanderSearchResult } from '@/lib/scryfall';
import { Loader2, Search, Swords, X } from 'lucide-react';

interface GuestCommanderPickerProps {
  deckName: string;
  onDeckNameChange: (value: string) => void;
  onSelectCommander: (commander: CommanderSearchResult | null) => void;
  selectedCommander: CommanderSearchResult | null;
  selectedPartnerCommander: CommanderSearchResult | null;
  onSelectPartnerCommander: (commander: CommanderSearchResult | null) => void;
  disabled?: boolean;
}

export function GuestCommanderPicker({
  deckName,
  onDeckNameChange,
  onSelectCommander,
  selectedCommander,
  selectedPartnerCommander,
  onSelectPartnerCommander,
  disabled = false,
}: GuestCommanderPickerProps) {
  const { copy: t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CommanderSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [partnerSearchResults, setPartnerSearchResults] = useState<CommanderSearchResult[]>([]);
  const [searchingPartner, setSearchingPartner] = useState(false);

  const partnerMode = selectedCommander ? getCommanderPartnerMode(selectedCommander) : null;
  const partnerCopy = partnerMode ? getCommanderPartnerCopy(partnerMode, t) : null;

  const searchCommanders = useCallback(async (query: string, mode: typeof partnerMode = null) => {
    if (query.trim().length < 2) {
      if (mode) setPartnerSearchResults([]);
      else setSearchResults([]);
      return;
    }

    if (mode) setSearchingPartner(true);
    else setSearching(true);

    try {
      const params = new URLSearchParams({ q: query.trim() });
      if (mode) params.set('partnerMode', mode);
      const response = await authenticatedFetch(`/api/scryfall-commanders?${params.toString()}`);
      if (!response.ok) throw new Error('Search failed');
      const payload = await response.json();
      const results = Array.isArray(payload.data) ? payload.data as CommanderSearchResult[] : [];
      if (mode) setPartnerSearchResults(results);
      else setSearchResults(results);
    } catch {
      if (mode) setPartnerSearchResults([]);
      else setSearchResults([]);
    } finally {
      if (mode) setSearchingPartner(false);
      else setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void searchCommanders(searchQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery, searchCommanders]);

  useEffect(() => {
    if (!partnerMode || !selectedCommander) {
      setPartnerSearchQuery('');
      setPartnerSearchResults([]);
      return;
    }

    if (selectedPartnerCommander && partnerSearchQuery === selectedPartnerCommander.name) {
      return;
    }

    const timer = window.setTimeout(() => {
      void searchCommanders(partnerSearchQuery, partnerMode);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [partnerMode, partnerSearchQuery, searchCommanders, selectedCommander, selectedPartnerCommander]);

  const handleSelectCommander = (commander: CommanderSearchResult) => {
    onSelectCommander(commander);
    onSelectPartnerCommander(null);
    setPartnerSearchQuery('');
    setPartnerSearchResults([]);
    if (!deckName || deckName === selectedCommander?.name) {
      onDeckNameChange(commander.name);
    }
  };

  const handleSelectPartner = (partner: CommanderSearchResult) => {
    if (!selectedCommander) return;
    onSelectPartnerCommander(partner);
    setPartnerSearchQuery(partner.name);
    setPartnerSearchResults([]);
    const combinedName = `${selectedCommander.name} // ${partner.name}`;
    if (!deckName || deckName === selectedCommander.name || deckName === `${selectedCommander.name} // ${selectedPartnerCommander?.name}`) {
      onDeckNameChange(combinedName);
    }
  };

  const clearPartner = () => {
    if (!selectedCommander) return;
    onSelectPartnerCommander(null);
    setPartnerSearchQuery('');
    setPartnerSearchResults([]);
    if (deckName === `${selectedCommander.name} // ${selectedPartnerCommander?.name}`) {
      onDeckNameChange(selectedCommander.name);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t({ it: 'Nome mazzo (opzionale)', en: 'Deck name (optional)' })}
        </label>
        <Input
          value={deckName}
          onChange={(event) => onDeckNameChange(event.target.value)}
          placeholder={t({ it: 'Es. Gruul Stompy', en: 'e.g. Gruul Stompy' })}
          className="bg-background/50 border-border text-foreground"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t({ it: 'Cerca comandante', en: 'Search commander' })}
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t({ it: 'Nome carta...', en: 'Card name...' })}
            className="bg-background/50 border-border pl-9 text-foreground"
            disabled={disabled}
          />
        </div>
      </div>

      {searching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t({ it: 'Ricerca su Scryfall...', en: 'Searching Scryfall...' })}
        </div>
      )}

      {!searching && searchResults.length > 0 && (
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {searchResults.map((commander) => {
            const selected = selectedCommander?.id === commander.id;
            return (
              <button
                key={commander.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectCommander(commander)}
                className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors ${
                  selected
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-border bg-background/30 hover:border-violet-500/50'
                }`}
              >
                <DeckImage
                  src={commander.imageUrl}
                  alt={commander.name}
                  className="h-14 w-14 shrink-0 rounded-md object-cover object-top"
                  fallbackClassName="h-14 w-14 shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{commander.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{commander.typeLine}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedCommander && (
        <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-3">
          <p className="text-xs uppercase tracking-wide text-violet-200">
            {t({ it: 'Comandante selezionato', en: 'Selected commander' })}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <DeckImage
              src={selectedCommander.imageUrl}
              alt={selectedCommander.name}
              className="h-16 w-16 rounded-md object-cover object-top"
            />
            <div>
              <p className="font-medium text-foreground">{selectedCommander.name}</p>
              <p className="text-xs text-muted-foreground">{selectedCommander.typeLine}</p>
            </div>
          </div>
        </div>
      )}

      {partnerMode && partnerCopy && selectedCommander && (
        <div className="space-y-3 rounded-lg border border-border bg-background/35 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">{partnerCopy.title}</p>
            <p className="text-xs text-muted-foreground">
              {t({ it: 'Aggiungi un secondo comandante se vuoi salvare la coppia.', en: 'Add a second commander if you want to save the pair.' })}
            </p>
          </div>

          {selectedPartnerCommander && (
            <div className="flex items-center gap-3 rounded-lg border border-violet-500/40 bg-violet-500/10 p-2">
              <DeckImage
                src={selectedPartnerCommander.imageUrl}
                alt={selectedPartnerCommander.name}
                className="h-16 w-12 rounded object-cover object-top"
                fallbackClassName="h-16 w-12 rounded"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{selectedPartnerCommander.name}</p>
                <p className="text-xs text-muted-foreground">{selectedPartnerCommander.typeLine}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={clearPartner}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={partnerSearchQuery}
              onChange={(event) => setPartnerSearchQuery(event.target.value)}
              placeholder={partnerCopy.placeholder}
              className="bg-background/50 border-border pl-9 text-foreground placeholder:text-muted-foreground"
              disabled={disabled}
            />
            {searchingPartner && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {partnerSearchResults.length > 0 && (
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
              {partnerSearchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  disabled={disabled}
                  className="flex w-full items-center gap-3 rounded p-2 text-left transition-colors hover:bg-accent"
                  onClick={() => handleSelectPartner(result)}
                >
                  {result.imageUrl ? (
                    <DeckImage
                      src={result.imageUrl}
                      alt={result.name}
                      className="h-16 w-12 rounded object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-16 w-12 items-center justify-center rounded bg-secondary">
                      <Swords className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{result.name}</p>
                    <p className="text-xs text-muted-foreground">{result.typeLine}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searchingPartner && partnerSearchQuery.length >= 2 && partnerSearchResults.length === 0 && (
            <p className="text-xs text-muted-foreground">{partnerCopy.empty}</p>
          )}
        </div>
      )}
    </div>
  );
}