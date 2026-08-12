import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import {
  extractScryfallImage,
  fetchCardByName,
  fetchCommanderArtOptions,
  fetchCommanderCard,
  fetchCommanderCmc,
  fetchCommanderImage,
  searchCommanders,
  type CommanderPartnerMode,
  type ScryfallCard,
} from '@/lib/scryfall';

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

const card: ScryfallCard = {
  id: 'ab1234',
  name: 'Atraxa',
  cmc: 4,
  type_line: 'Legendary Creature',
  color_identity: ['w', 'U', 'U', 'x'],
  oracle_text: 'Flying',
  keywords: ['Flying'],
  image_uris: { art_crop: 'https://cards.test/art.jpg' },
};

describe('Scryfall server adapter', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('uses all supported image fallbacks', () => {
    expect(extractScryfallImage(card)).toBe('https://cards.test/art.jpg');
    expect(extractScryfallImage({ id: 'xy123', name: 'Face', card_faces: [{ name: 'Face', image_uris: { art_crop: 'face-art' } }] })).toBe('face-art');
    expect(extractScryfallImage({ id: 'cd123', name: 'Generated' })).toContain('/c/d/cd123.webp');
    expect(extractScryfallImage({ id: '', name: 'Large', image_uris: { large: 'large' } })).toBe('large');
    expect(extractScryfallImage({ id: '', name: 'Normal', image_uris: { normal: 'normal' } })).toBe('normal');
    expect(extractScryfallImage({ id: '', name: 'Face', card_faces: [{ name: 'Face', image_uris: { large: 'face-large' } }] })).toBe('face-large');
    expect(extractScryfallImage({ id: '', name: 'Face', card_faces: [{ name: 'Face', image_uris: { normal: 'face-normal' } }] })).toBe('face-normal');
    expect(extractScryfallImage({ id: '', name: 'None' })).toBeNull();
  });

  it('sanitizes names and falls back from exact to fuzzy lookup', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({}, 404))
      .mockResolvedValueOnce(jsonResponse(card));
    await expect(fetchCardByName('  "Atraxa"  ')).resolves.toMatchObject({ name: 'Atraxa' });
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('exact=Atraxa');
    await expect(fetchCardByName('   ')).resolves.toBeNull();
  });

  it('falls back through commander searches and handles failures safely', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({}, 404))
      .mockResolvedValueOnce(jsonResponse({}, 404))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(jsonResponse({ data: [card] }));
    await expect(fetchCommanderCard('Atraxa fallback')).resolves.toMatchObject({ id: 'ab1234' });
    await expect(fetchCommanderCard('Unknown Commander')).resolves.toBeNull();

    vi.mocked(fetch).mockReset().mockResolvedValue(jsonResponse({}, 400));
    await expect(fetchCommanderCard('Broken')).resolves.toBeNull();
  });

  it('resolves commander CMC and the matching transform face image', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({
      id: 'dfc123', name: 'Front // Back', card_faces: [
        { name: 'Front', cmc: 3, mana_cost: '{1}{U}{R}', image_uris: { art_crop: 'front' } },
        { name: 'Back', image_uris: { normal: 'back-normal' } },
      ],
    }));
    await expect(fetchCommanderCmc('Front')).resolves.toBe(3);

    vi.mocked(fetch).mockReset().mockResolvedValueOnce(jsonResponse({
      id: 'dfc456', name: 'Front // Back', card_faces: [
        { name: 'Front', image_uris: { art_crop: 'front' } },
        { name: 'Back', image_uris: { normal: 'back-normal' } },
      ],
    }));
    await expect(fetchCommanderImage('Back')).resolves.toBe('back-normal');
    await expect(fetchCommanderImage('Unknown Commander')).resolves.toBeNull();
  });

  it('builds commander searches for every partner mode', async () => {
    const modes: Array<CommanderPartnerMode | null> = [null, 'partner', 'background', 'background-owner', 'friends', 'doctor', 'doctor-companion'];
    for (const mode of modes) {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: [card] }));
      const result = await searchCommanders('at', mode);
      expect(result[0]).toEqual({
        id: 'ab1234', name: 'Atraxa', imageUrl: 'https://cards.test/art.jpg', typeLine: 'Legendary Creature',
        colorIdentity: ['W', 'U'], oracleText: 'Flying', keywords: ['Flying'],
      });
    }
    await expect(searchCommanders('a')).resolves.toEqual([]);
  });

  it('maps and caches art options, excluding cards without images', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: [
      { ...card, set_name: 'Multiverse Legends', collector_number: '1', released_at: '2023-01-01' },
      { id: '', name: 'No image' },
    ] }));
    const first = await fetchCommanderArtOptions('Unique Art Test');
    expect(first).toEqual([expect.objectContaining({ id: 'ab1234', setName: 'Multiverse Legends', collectorNumber: '1' })]);
    await expect(fetchCommanderArtOptions('unique art test')).resolves.toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(fetchCommanderArtOptions('x')).resolves.toEqual([]);
  });
});
