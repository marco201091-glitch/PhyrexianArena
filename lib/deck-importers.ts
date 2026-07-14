import { buildDeckColorFields } from '@/lib/deck-metadata';

export type DeckSource = 'archidekt' | 'moxfield';

export function isImportedDeckSource(sourceType: string | null | undefined): sourceType is DeckSource {
  return sourceType === 'archidekt' || sourceType === 'moxfield';
}

export interface CommanderOption {
  name: string;
  imageUrl: string | null;
  colorIdentity?: string[];
}

export interface DeckData {
  name: string;
  commander: string;
  commanderImageUrl: string | null;
  commanderOptions: CommanderOption[];
  colorIdentity: string[];
  bracket: string | null;
}

export type ImportedDeckCommanderSource = {
  commander: string;
  commanderImageUrl: string | null;
  commanderOptions?: CommanderOption[] | null;
  colorIdentity?: string[] | null;
};

export function getDefaultImportedCommanderOption(deck: ImportedDeckCommanderSource): CommanderOption {
  const options = deck.commanderOptions || [];
  if (options.length > 0) {
    return options[0];
  }

  return {
    name: deck.commander,
    imageUrl: deck.commanderImageUrl,
    colorIdentity: deck.colorIdentity || [],
  };
}

export function isImportedCommanderOptionSelected(
  selected: CommanderOption | null | undefined,
  option: CommanderOption,
) {
  return selected?.name === option.name;
}

function firstNonEmptyImageUrl(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }

  return null;
}

export function resolveImportedDeckCommanderImage(
  selectedCommander: CommanderOption,
  deck: ImportedDeckCommanderSource,
  options?: { preserveImage?: string | null },
): string | null {
  const matchingOption = deck.commanderOptions?.find(
    (option) => option.name === selectedCommander.name,
  );

  return firstNonEmptyImageUrl(
    selectedCommander.imageUrl,
    matchingOption?.imageUrl,
    deck.commanderImageUrl,
    options?.preserveImage,
  );
}

export function resolveImportedCommanderAfterArtsLoad(
  commander: CommanderOption,
  arts: Array<{ imageUrl: string }>,
): CommanderOption {
  const matchingArt = arts.find((art) => art.imageUrl === commander.imageUrl);
  const firstArt = arts[0];

  return {
    name: commander.name,
    imageUrl: matchingArt?.imageUrl || commander.imageUrl || firstArt?.imageUrl || null,
    colorIdentity: commander.colorIdentity,
  };
}

export function buildArchidektBatchCommanderSelections(
  decks: Array<ImportedDeckCommanderSource & { sourceUrl: string }>,
): Record<string, CommanderOption> {
  return decks.reduce<Record<string, CommanderOption>>((selectionMap, deck) => {
    selectionMap[deck.sourceUrl] = getDefaultImportedCommanderOption(deck);
    return selectionMap;
  }, {});
}

export function importedCommanderOptionsNeedImageRepair(options: CommanderOption[]): boolean {
  if (options.length <= 1) return false;

  const urls = options
    .map((option) => option.imageUrl?.trim())
    .filter((url): url is string => Boolean(url));

  if (urls.length === 0) return true;
  return new Set(urls).size < options.length;
}

export async function repairImportedCommanderOptions(
  options: CommanderOption[],
  resolveImageUrl: (name: string) => Promise<string | null>,
): Promise<CommanderOption[]> {
  if (!importedCommanderOptionsNeedImageRepair(options)) {
    return options;
  }

  const assignedUrls = new Set<string>();

  return Promise.all(options.map(async (option, index) => {
    const currentUrl = option.imageUrl?.trim() || '';
    const isDuplicate = currentUrl
      ? options.some((other, otherIndex) =>
        otherIndex !== index && other.imageUrl?.trim() === currentUrl
      )
      : true;

    if (currentUrl && !isDuplicate && !assignedUrls.has(currentUrl)) {
      assignedUrls.add(currentUrl);
      return option;
    }

    const resolvedUrl = (await resolveImageUrl(option.name))?.trim() || null;
    if (resolvedUrl) {
      assignedUrls.add(resolvedUrl);
      return { ...option, imageUrl: resolvedUrl };
    }

    if (currentUrl) {
      assignedUrls.add(currentUrl);
    }

    return option;
  }));
}

export function deckDataToColorFields(deckData: Pick<DeckData, 'commanderOptions' | 'colorIdentity'>) {
  return buildDeckColorFields(deckData.commanderOptions, deckData.colorIdentity);
}

export function buildCanonicalDeckSourceUrl(source: DeckSource, deckId: string) {
  if (source === 'archidekt') {
    return `https://archidekt.com/decks/${deckId}`;
  }

  return `https://www.moxfield.com/decks/${deckId}`;
}

export function extractDeckId(url: string): { source: DeckSource; deckId: string } | null {
  const archidektMatch = url.match(/archidekt\.com\/decks\/(\d+)/i);
  if (archidektMatch) {
    return { source: 'archidekt', deckId: archidektMatch[1] };
  }

  const archidektPlaytesterMatch = url.match(/archidekt\.com\/playtester(?:-v\d+)?\/(\d+)/i);
  if (archidektPlaytesterMatch) {
    return { source: 'archidekt', deckId: archidektPlaytesterMatch[1] };
  }

  const moxfieldMatch = url.match(/moxfield\.com\/decks\/([a-zA-Z0-9_-]+)/i);
  if (moxfieldMatch) {
    return { source: 'moxfield', deckId: moxfieldMatch[1] };
  }

  return null;
}