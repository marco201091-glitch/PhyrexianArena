import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiPost: vi.fn(),
  fetchCommanderArtOptions: vi.fn(),
  repairImportedCommanderOptions: vi.fn(),
  resolveImportedDeckCommanderImage: vi.fn(),
  rpc: vi.fn(),
  single: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ apiPost: mocks.apiPost }));
vi.mock('@/lib/commander-arts', () => ({
  fetchCommanderArtOptions: mocks.fetchCommanderArtOptions,
}));
vi.mock('@/lib/deck-importers', () => ({
  deckDataToColorFields: () => ({
    color_identity: ['U'],
    commander_options: [{ name: 'Talrand', imageUrl: 'image' }],
    commander_cmc: null,
  }),
  getDefaultImportedCommanderOption: () => ({ name: 'Talrand', imageUrl: 'image' }),
  repairImportedCommanderOptions: mocks.repairImportedCommanderOptions,
  resolveImportedDeckCommanderImage: mocks.resolveImportedDeckCommanderImage,
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: mocks.single }),
      }),
    }),
    rpc: mocks.rpc,
  },
}));

import {
  runArchidektAutoSync,
  syncArchidektUserDecks,
} from '@/lib/archidekt-auto-sync';

describe('Archidekt automatic sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.repairImportedCommanderOptions.mockResolvedValue([
      { name: 'Talrand', imageUrl: 'image' },
    ]);
    mocks.resolveImportedDeckCommanderImage.mockReturnValue('image');
    mocks.rpc.mockResolvedValue({
      data: { inserted: 1, updated: 0 },
      error: null,
    });
  });

  it('imports public Commander decks through the atomic RPC', async () => {
    mocks.apiPost.mockResolvedValue({
      status: 200,
      data: {
        decks: [{
          name: 'Talrand Control',
          commander: 'Talrand, Sky Summoner',
          commanderImageUrl: 'image',
          commanderOptions: [{ name: 'Talrand', imageUrl: 'image' }],
          colorIdentity: ['U'],
          bracket: '3',
          sourceUrl: 'https://archidekt.com/decks/123',
          sourceType: 'archidekt',
        }],
      },
    });

    await expect(syncArchidektUserDecks('marco')).resolves.toEqual({
      inserted: 1,
      updated: 0,
      skipped: 0,
    });
    expect(mocks.rpc).toHaveBeenCalledWith('sync_archidekt_decks', {
      p_decks: [expect.objectContaining({
        name: 'Talrand Control',
        commander: 'Talrand',
        source_type: 'archidekt',
      })],
    });
  });

  it('keeps checking globally but skips a recent completed sync', async () => {
    mocks.single.mockResolvedValue({
      data: {
        archidekt_username: 'marco',
        archidekt_auto_import: true,
        archidekt_last_sync_at: new Date().toISOString(),
      },
      error: null,
    });

    await expect(runArchidektAutoSync('user-id')).resolves.toEqual({
      inserted: 0,
      updated: 0,
      skipped: 0,
    });
    expect(mocks.apiPost).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('forces the first import immediately after settings are saved', async () => {
    mocks.single.mockResolvedValue({
      data: {
        archidekt_username: 'marco',
        archidekt_auto_import: true,
        archidekt_last_sync_at: new Date().toISOString(),
      },
      error: null,
    });
    mocks.apiPost.mockResolvedValue({ status: 200, data: { decks: [] } });
    mocks.rpc.mockResolvedValue({
      data: { inserted: 0, updated: 0 },
      error: null,
    });

    await runArchidektAutoSync('user-id', { force: true });
    expect(mocks.apiPost).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith('sync_archidekt_decks', { p_decks: [] });
  });
});
