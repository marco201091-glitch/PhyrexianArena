export interface CommanderMetadataOption {
  name: string;
  imageUrl: string | null;
  colorIdentity?: string[];
}

export interface DeckColorRecord {
  color_identity?: string[] | null;
  commander_options?: CommanderMetadataOption[] | null;
}

export const DECK_COLORLESS = 'C';
const MANA_COLORS = ['W', 'U', 'B', 'R', 'G', DECK_COLORLESS] as const;

export function normalizeDeckColorIdentity(value: unknown): string[] {
  const colors = Array.isArray(value) ? value : [];
  const colorMap: Record<string, string> = {
    WHITE: 'W',
    BLUE: 'U',
    BLACK: 'B',
    RED: 'R',
    GREEN: 'G',
    COLORLESS: DECK_COLORLESS,
  };

  return Array.from(new Set(colors
    .map((color) => String(color).trim().toUpperCase())
    .map((color) => colorMap[color] || color)
    .filter((color): color is typeof MANA_COLORS[number] => MANA_COLORS.includes(color as typeof MANA_COLORS[number]))));
}

export function getCommanderOptions(deck: DeckColorRecord): CommanderMetadataOption[] {
  const options = deck.commander_options;
  if (!Array.isArray(options)) return [];

  return options.filter((option): option is CommanderMetadataOption =>
    option &&
    typeof option === 'object' &&
    typeof option.name === 'string'
  );
}

function uniqueCommanderOptionsByName<T extends { name: string }>(options: T[]): T[] {
  return options.filter((option, index, allOptions) =>
    option.name?.trim() &&
    allOptions.findIndex((candidate) =>
      candidate.name.trim().toLowerCase() === option.name.trim().toLowerCase()
    ) === index
  );
}

export function filterSelectableCommanderOptions<T extends { name: string }>(options: T[]): T[] {
  const unique = uniqueCommanderOptionsByName(options);
  const individuals = unique.filter((option) => !option.name.includes('//'));

  if (individuals.length < 2) {
    return unique;
  }

  const individualNames = new Set(individuals.map((option) => option.name.trim().toLowerCase()));
  return unique.filter((option) => {
    if (!option.name.includes('//')) return true;

    const parts = option.name
      .split('//')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);

    if (parts.length < 2) return true;
    return !parts.every((part) => individualNames.has(part));
  });
}

export function resolveSelectedCommanderOption<T extends { name: string; imageUrl?: string | null }>(
  options: T[],
  commander: string,
  commanderImage?: string | null,
): T | null {
  if (options.length === 0) return null;

  const normalizedCommander = commander.trim().toLowerCase();
  const exact = options.find((option) => option.name.trim().toLowerCase() === normalizedCommander);
  if (exact) return exact;

  if (commander.includes('//')) {
    const imageMatch = options.find((option) =>
      Boolean(commanderImage && option.imageUrl && option.imageUrl === commanderImage)
    );
    if (imageMatch) return imageMatch;

    const parts = commander
      .split('//')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);

    const partMatch = options.find((option) => parts.includes(option.name.trim().toLowerCase()));
    if (partMatch) return partMatch;
  }

  return options[0] || null;
}

export function getDeckStoredColorIdentity(deck: DeckColorRecord): string[] {
  return normalizeDeckColorIdentity(deck.color_identity);
}

export function mergeCommanderOptionColors(options: CommanderMetadataOption[] | undefined): string[] {
  return normalizeDeckColorIdentity((options || []).flatMap((option) => option.colorIdentity || []))
    .filter((color) => color !== DECK_COLORLESS);
}

export function finalizeDeckColorIdentity(colors: string[]): string[] {
  const normalized = normalizeDeckColorIdentity(colors).filter((color) => color !== DECK_COLORLESS);
  return normalized.length > 0 ? normalized : [DECK_COLORLESS];
}

export function deckHasColorIdentity(deck: DeckColorRecord) {
  if (getDeckStoredColorIdentity(deck).length > 0) return true;
  return getCommanderOptions(deck).some((option) => Array.isArray(option.colorIdentity) && option.colorIdentity.length > 0);
}

export function getDeckDisplayColors(deck: DeckColorRecord): string[] {
  const storedColors = getDeckStoredColorIdentity(deck);
  if (storedColors.length > 0) return storedColors;

  const derivedColors = mergeCommanderOptionColors(getCommanderOptions(deck));
  if (derivedColors.length > 0) return finalizeDeckColorIdentity(derivedColors);

  return deckHasColorIdentity(deck) ? [DECK_COLORLESS] : [];
}

export function buildDeckColorFields(
  commanderOptions: CommanderMetadataOption[] | undefined,
  explicitColorIdentity?: string[],
): Pick<DeckColorRecord, 'color_identity' | 'commander_options'> {
  const options = commanderOptions?.filter((option) => option?.name) || [];
  const color_identity = finalizeDeckColorIdentity([
    ...(explicitColorIdentity || []),
    ...mergeCommanderOptionColors(options),
  ]);

  return {
    color_identity,
    commander_options: options.length > 0 ? options : null,
  };
}

export function mergeDeckColorFields(
  deck: DeckColorRecord,
  commanderOptions: CommanderMetadataOption[] | undefined,
): Pick<DeckColorRecord, 'color_identity' | 'commander_options'> {
  const options = commanderOptions?.filter((option) => option?.name) || getCommanderOptions(deck);
  const color_identity = finalizeDeckColorIdentity([
    ...getDeckStoredColorIdentity(deck).filter((color) => color !== DECK_COLORLESS),
    ...mergeCommanderOptionColors(options),
  ]);

  return {
    color_identity,
    commander_options: options.length > 0 ? options : deck.commander_options ?? null,
  };
}