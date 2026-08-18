import { describe, expect, it } from 'vitest';
import { getCommanderPartnerMode } from '@/lib/commander-partners';
import type { CommanderSearchResult } from '@/lib/scryfall';

function commander(oracleText: string, keywords: string[] = []): CommanderSearchResult {
  return {
    id: 'commander',
    name: 'Commander',
    imageUrl: null,
    typeLine: 'Legendary Creature',
    colorIdentity: [],
    oracleText,
    keywords,
  };
}

describe('web commander partner recognition', () => {
  it('keeps grouped and named partner families compatible only with their own pair', () => {
    expect(getCommanderPartnerMode(commander('Partner with Rocksteady, Mutant Marauder (Reminder)')))
      .toBe('partner-with:Rocksteady, Mutant Marauder');
    expect(getCommanderPartnerMode(commander('Partner—Character select'))).toBe('character-select');
    expect(getCommanderPartnerMode(commander('Partner—Future team'))).toBe('partner-family:Future team');
    expect(getCommanderPartnerMode(commander('Partner', ['Partner']))).toBe('partner');
  });
});
