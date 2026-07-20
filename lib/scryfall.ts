import { isScryfallError, resolveCommanderCmcFromCard } from '@/lib/commander-cmc';

export { extractCardCmc, resolveCommanderCmcFromCard } from '@/lib/commander-cmc';

export interface ScryfallCard {
  id: string;
  name: string;
  cmc?: number;
  color_identity?: string[];
  oracle_text?: string;
  keywords?: string[];
  image_uris?: {
    art_crop?: string;
    normal?: string;
    large?: string;
  };
  card_faces?: Array<{
    name: string;
    cmc?: number;
    mana_cost?: string;
    image_uris?: {
      art_crop?: string;
      normal?: string;
      large?: string;
    };
  }>;
  mana_cost?: string;
  object?: string;
  type_line?: string;
}

interface ScryfallSearchResponse {
  data: ScryfallCard[];
  has_more?: boolean;
  total_cards?: number;
}

export interface CommanderSearchResult {
  id: string;
  name: string;
  imageUrl: string | null;
  typeLine: string;
  colorIdentity: string[];
  oracleText: string;
  keywords: string[];
}

export interface CommanderArtOption {
  id: string;
  name: string;
  imageUrl: string;
  setName: string;
  collectorNumber: string;
  releasedAt: string | null;
}

const SCRYFALL_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Phyrexian Arena (https://phyrexianarena.app)',
};

const SCRYFALL_MAX_RETRIES = 2;
const SCRYFALL_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function normalizeColorIdentity(value: unknown): string[] {
  const colors = Array.isArray(value) ? value : [];
  return Array.from(new Set(colors
    .map((color) => String(color).trim().toUpperCase())
    .filter((color) => ['W', 'U', 'B', 'R', 'G'].includes(color))));
}

function buildDisplayUrl(scryfallId: string): string {
  return `https://cards.scryfall.io/display/front/${scryfallId[0]}/${scryfallId[1]}/${scryfallId}.webp`;
}

export function extractScryfallImage(card: ScryfallCard): string | null {
  if (card.image_uris?.art_crop) return card.image_uris.art_crop;
  if (card.card_faces?.[0]?.image_uris?.art_crop) return card.card_faces[0].image_uris.art_crop;
  if (card.id) return buildDisplayUrl(card.id);
  if (card.image_uris?.large) return card.image_uris.large;
  if (card.image_uris?.normal) return card.image_uris.normal;
  if (card.card_faces?.[0]?.image_uris?.large) return card.card_faces[0].image_uris.large;
  if (card.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal;
  return null;
}

function extractScryfallImageForName(card: ScryfallCard, preferredName: string): string | null {
  const normalizedName = preferredName.toLowerCase();
  const matchingFace = card.card_faces?.find((face) => face.name.toLowerCase() === normalizedName);
  if (matchingFace?.image_uris?.art_crop) return matchingFace.image_uris.art_crop;
  if (matchingFace?.image_uris?.large) return matchingFace.image_uris.large;
  if (matchingFace?.image_uris?.normal) return matchingFace.image_uris.normal;
  return extractScryfallImage(card);
}

function sanitizeCommanderQuery(query: string): string {
  return query.trim().replace(/"/g, '');
}

async function fetchScryfallJson<T>(url: string): Promise<T | null> {
  for (let attempt = 0; attempt <= SCRYFALL_MAX_RETRIES; attempt += 1) {
    const response = await fetch(url, { headers: SCRYFALL_HEADERS });
    if (response.status === 404) return null;
    if (response.ok) return response.json() as Promise<T>;

    if (!SCRYFALL_RETRYABLE_STATUSES.has(response.status) || attempt === SCRYFALL_MAX_RETRIES) {
      throw new Error(`Scryfall request failed (${response.status})`);
    }

    const retryAfterSeconds = Number(response.headers.get('retry-after'));
    const retryDelay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? retryAfterSeconds * 1_000
      : 250 * (2 ** attempt);
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }

  throw new Error('Scryfall request retry loop exhausted');
}

function isResolvedScryfallCard(card: ScryfallCard | null): card is ScryfallCard {
  return Boolean(card && !isScryfallError(card));
}

export async function fetchCardByName(name: string): Promise<ScryfallCard | null> {
  const queryText = sanitizeCommanderQuery(name);
  if (!queryText) return null;

  const exact = await fetchScryfallJson<ScryfallCard>(
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(queryText)}`,
  );
  if (isResolvedScryfallCard(exact)) return exact;

  const fuzzy = await fetchScryfallJson<ScryfallCard>(
    `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(queryText)}`,
  );
  if (isResolvedScryfallCard(fuzzy)) return fuzzy;

  return null;
}

export async function fetchCommanderCard(commanderName: string): Promise<ScryfallCard | null> {
  const queryText = sanitizeCommanderQuery(commanderName);
  if (!queryText || queryText === 'Unknown Commander') return null;

  const named = await fetchCardByName(queryText);
  if (named) return named;

  try {
    const commanderSearch = await fetchScryfallJson<ScryfallSearchResponse>(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`is:commander name:"${queryText}"`)}&unique=cards`,
    );
    const commanderCard = commanderSearch?.data?.[0];
    if (commanderCard) return commanderCard;

    const broadSearch = await fetchScryfallJson<ScryfallSearchResponse>(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(queryText)}&unique=cards`,
    );
    return broadSearch?.data?.[0] || null;
  } catch (error) {
    console.error('fetchCommanderCard error for', commanderName, error);
    return null;
  }
}

export async function fetchCommanderCmc(commanderName: string): Promise<number | null> {
  const queryText = sanitizeCommanderQuery(commanderName);
  if (!queryText) return null;

  const card = await fetchCommanderCard(queryText);
  return resolveCommanderCmcFromCard(card, queryText);
}

export async function fetchCommanderImage(commanderName: string): Promise<string | null> {
  const queryText = sanitizeCommanderQuery(commanderName);
  if (!queryText || queryText === 'Unknown Commander') return null;

  try {
    const exact = await fetchScryfallJson<ScryfallCard>(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(queryText)}`
    );
    if (exact) return extractScryfallImageForName(exact, queryText);

    const fuzzy = await fetchScryfallJson<ScryfallCard>(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(queryText)}`
    );
    if (fuzzy) return extractScryfallImageForName(fuzzy, queryText);

    const commanderSearch = await fetchScryfallJson<ScryfallSearchResponse>(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`is:commander name:"${queryText}"`)}&unique=cards`
    );
    const commanderCard = commanderSearch?.data?.[0];
    if (commanderCard) return extractScryfallImage(commanderCard);

    const broadSearch = await fetchScryfallJson<ScryfallSearchResponse>(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(queryText)}&unique=cards`
    );
    const broadCard = broadSearch?.data?.[0];
    if (broadCard) return extractScryfallImage(broadCard);

    return null;
  } catch (error) {
    console.error('fetchCommanderImage error for', commanderName, error);
    return null;
  }
}

export type CommanderPartnerMode =
  | 'partner'
  | 'background'
  | 'background-owner'
  | 'friends'
  | 'doctor'
  | 'doctor-companion';

function partnerModeQuery(mode: CommanderPartnerMode | null) {
  if (mode === 'background') return 'is:commander t:background';
  if (mode === 'background-owner') return 'is:commander o:"choose a background"';
  if (mode === 'friends') return 'is:commander o:"friends forever"';
  if (mode === 'doctor') return 'is:commander t:doctor t:"time lord"';
  if (mode === 'doctor-companion') return 'is:commander o:"doctor\'s companion"';
  if (mode === 'partner') return 'is:commander o:partner -o:"partner with"';
  return 'is:commander';
}

function toCommanderSearchResult(card: ScryfallCard): CommanderSearchResult {
  return {
    id: card.id,
    name: card.name,
    imageUrl: extractScryfallImage(card),
    typeLine: card.type_line || '',
    colorIdentity: normalizeColorIdentity(card.color_identity),
    oracleText: card.oracle_text || '',
    keywords: Array.isArray(card.keywords) ? card.keywords : [],
  };
}

export async function searchCommanders(query: string, partnerMode: CommanderPartnerMode | null = null): Promise<CommanderSearchResult[]> {
  const queryText = sanitizeCommanderQuery(query);
  if (queryText.length < 2) return [];

  try {
    const baseQuery = partnerModeQuery(partnerMode);
    const search = await fetchScryfallJson<ScryfallSearchResponse>(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`${baseQuery} (${queryText} or name:"${queryText}")`)}&order=edhrec&unique=cards`
    );

    return (search?.data || []).slice(0, 20).map(toCommanderSearchResult);
  } catch (error) {
    console.error('searchCommanders error for', query, error);
    throw error;
  }
}

export async function fetchCommanderArtOptions(commanderName: string): Promise<CommanderArtOption[]> {
  const queryText = sanitizeCommanderQuery(commanderName);
  if (queryText.length < 2) return [];

  try {
    const search = await fetchScryfallJson<ScryfallSearchResponse>(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`!"${queryText}"`)}&unique=art&order=released`
    );

    return (search?.data || [])
      .map((card) => {
        const imageUrl = extractScryfallImageForName(card, queryText);
        if (!imageUrl) return null;

        return {
          id: card.id,
          name: card.name,
          imageUrl,
          setName: (card as ScryfallCard & { set_name?: string }).set_name || '',
          collectorNumber: (card as ScryfallCard & { collector_number?: string }).collector_number || '',
          releasedAt: (card as ScryfallCard & { released_at?: string }).released_at || null,
        };
      })
      .filter((option): option is CommanderArtOption => Boolean(option));
  } catch (error) {
    console.error('fetchCommanderArtOptions error for', commanderName, error);
    throw error;
  }
}
