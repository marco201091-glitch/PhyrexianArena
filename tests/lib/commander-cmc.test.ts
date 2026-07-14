import { describe, expect, it } from 'vitest';
import { extractCardCmc, resolveCommanderCmcFromCard } from '@/lib/commander-cmc';

describe('commander-cmc', () => {
  it('reads top-level card cmc', () => {
    expect(extractCardCmc({ id: '1', name: 'Sol Ring', cmc: 1 })).toBe(1);
  });

  it('reads matching face cmc for double-faced commanders', () => {
    const cmc = extractCardCmc(
      {
        id: '1',
        name: 'Delver of Secrets // Insectile Aberration',
        cmc: 3,
        card_faces: [
          { name: 'Delver of Secrets', cmc: 1, mana_cost: '{U}' },
          { name: 'Insectile Aberration', cmc: 3, mana_cost: '{2}{U}' },
        ],
      },
      'Delver of Secrets',
    );

    expect(cmc).toBe(1);
  });

  it('falls back to mana_cost when cmc is missing', () => {
    expect(extractCardCmc({
      id: '1',
      name: 'Counterspell',
      mana_cost: '{U}{U}',
    })).toBe(2);
  });

  it('returns null for scryfall error payloads', () => {
    expect(resolveCommanderCmcFromCard({ object: 'error' } as never, 'Missing')).toBeNull();
  });
});