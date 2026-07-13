'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BracketBadge } from '@/components/deck/bracket-badge';
import { DeckImage } from '@/components/deck-image';
import { useLanguage } from '@/components/language-provider';
import type { ArenaGuestDeck } from '@/lib/arena-participants';
import type { ParticipantKey } from '@/lib/participant-keys';
import { Eye, EyeOff, Search } from 'lucide-react';

interface DeckOption {
  id: string;
  name: string;
  commander: string;
  commander_image: string | null;
  bracket: string | null;
  source_type?: string | null;
}

interface MatchParticipantRowProps {
  participantKey: ParticipantKey;
  displayName: string;
  isGuest?: boolean;
  deckCount: number;
  selected: boolean;
  selectedDeck: DeckOption | null;
  deckListHidden: boolean;
  searchValue: string;
  selectedDeckId: string;
  filteredDecks: DeckOption[];
  onToggle: () => void;
  onSearchChange: (value: string) => void;
  onToggleDeckList: () => void;
  onSelectDeck: (deckId: string) => void;
}

export function MatchParticipantRow({
  participantKey,
  displayName,
  isGuest = false,
  deckCount,
  selected,
  selectedDeck,
  deckListHidden,
  searchValue,
  selectedDeckId,
  filteredDecks,
  onToggle,
  onSearchChange,
  onToggleDeckList,
  onSelectDeck,
}: MatchParticipantRowProps) {
  const { copy: t } = useLanguage();

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        selected
          ? 'border-violet-500 bg-violet-500/10'
          : 'border-border hover:border-violet-500/50 cursor-pointer'
      }`}
      onClick={() => !selected && onToggle()}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`h-4 w-4 shrink-0 rounded border cursor-pointer ${
              selected ? 'bg-violet-500 border-violet-500' : 'border-border'
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{displayName}</span>
              {isGuest && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
                  Guest
                </span>
              )}
              {deckCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({deckCount} {t({ it: deckCount === 1 ? 'mazzo' : 'mazzi', en: deckCount === 1 ? 'deck' : 'decks' })})
                </span>
              )}
            </div>
            {selectedDeck && (
              <p className="mt-1 truncate text-xs text-violet-300">
                {selectedDeck.name} - {selectedDeck.commander}
              </p>
            )}
          </div>
        </div>

        {selected && deckCount > 0 && (
          <div className="flex flex-col gap-2 sm:min-w-80 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                placeholder={t({ it: 'Cerca mazzo...', en: 'Search deck...' })}
                className="h-9 bg-background/50 border-border pl-9 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-border text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onToggleDeckList();
              }}
            >
              {deckListHidden ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
              {deckListHidden ? t({ it: 'Mostra', en: 'Show' }) : t({ it: 'Nascondi', en: 'Hide' })}
            </Button>
          </div>
        )}
      </div>

      {selected && deckCount > 0 && (
        <div className="mt-3 sm:ml-7">
          {deckListHidden ? (
            <div className="rounded-lg border border-border/70 bg-background/35 px-3 py-2 text-xs text-muted-foreground">
              {selectedDeck
                ? t({ it: 'Lista mazzi nascosta. Il mazzo selezionato resta assegnato.', en: 'Deck list hidden. The selected deck stays assigned.' })
                : t({ it: 'Lista mazzi nascosta. Nessun mazzo selezionato.', en: 'Deck list hidden. No deck selected.' })}
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                {t({ it: 'Seleziona mazzo:', en: 'Select deck:' })}
              </p>
              {filteredDecks.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-flow-col sm:auto-cols-[minmax(290px,320px)] sm:overflow-x-auto sm:pb-3">
                  {filteredDecks.map((deck) => (
                    <button
                      key={`${participantKey}-${deck.id}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectDeck(deck.id === selectedDeckId ? '' : deck.id);
                      }}
                      className={`min-h-[7.5rem] rounded-lg border p-3 text-left transition-colors ${
                        selectedDeckId === deck.id
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-border bg-background/25 hover:border-violet-500/50'
                      }`}
                    >
                      <div className="flex h-full items-start gap-3">
                        <DeckImage
                          src={deck.commander_image}
                          alt={deck.commander}
                          className="h-20 w-24 shrink-0 rounded object-cover object-top"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{deck.name}</p>
                          <p className="line-clamp-2 text-xs leading-snug text-violet-400">{deck.commander}</p>
                          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1.5">
                            {deck.source_type && (
                              <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs ${
                                deck.source_type === 'archidekt'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : deck.source_type === 'moxfield'
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : 'bg-muted text-muted-foreground'
                              }`}>
                                {deck.source_type}
                              </span>
                            )}
                            <BracketBadge bracket={deck.bracket} />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-border/70 bg-background/35 px-3 py-2 text-xs text-muted-foreground">
                  {t({ it: 'Nessun mazzo trovato con questa ricerca', en: 'No decks match this search' })}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function toDeckOption(deck: DeckOption | ArenaGuestDeck): DeckOption {
  return {
    id: deck.id,
    name: deck.name,
    commander: deck.commander,
    commander_image: deck.commander_image,
    bracket: deck.bracket,
    source_type: 'source_type' in deck ? deck.source_type : 'guest',
  };
}