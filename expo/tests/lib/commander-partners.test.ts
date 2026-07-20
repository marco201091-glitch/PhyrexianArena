import { describe, expect, it } from 'vitest';
import { buildPairedCommanderColorFields, buildPairedCommanderName, getCommanderPartnerCopy, getCommanderPartnerMode } from '@/lib/commander-partners';
import type { CommanderSearchResult } from '@/lib/commander-types';

function commander(overrides: Partial<CommanderSearchResult> = {}): CommanderSearchResult {
  return { id: '1', name: 'Primary', imageUrl: 'primary.jpg', typeLine: 'Legendary Creature', colorIdentity: ['W'], oracleText: '', keywords: [], ...overrides };
}

describe('commander partners', () => {
  it('recognizes every supported partner mechanic without false partner-with matches', () => {
    expect(getCommanderPartnerMode(commander({ oracleText: 'Choose a Background' }))).toBe('background');
    expect(getCommanderPartnerMode(commander({ typeLine: 'Legendary Background' }))).toBe('background-owner');
    expect(getCommanderPartnerMode(commander({ typeLine: 'Legendary Time Lord Doctor' }))).toBe('doctor-companion');
    expect(getCommanderPartnerMode(commander({ oracleText: "Doctor's companion" }))).toBe('doctor');
    expect(getCommanderPartnerMode(commander({ keywords: ['Friends forever'] }))).toBe('friends');
    expect(getCommanderPartnerMode(commander({ keywords: ['Partner'] }))).toBe('partner');
    expect(getCommanderPartnerMode(commander({ oracleText: 'Partner with Amy' }))).toBeNull();
  });

  it('generates localized picker copy for specialized and regular modes', () => {
    const english = (copy: { en: string }) => copy.en;
    expect(getCommanderPartnerCopy('background', english).placeholder).toBe('Search background...');
    expect(getCommanderPartnerCopy('doctor', english).title).toBe('Doctor');
    expect(getCommanderPartnerCopy('friends', english).title).toBe('Friends forever');
    expect(getCommanderPartnerCopy('partner', english).empty).toBe('No second commander found');
  });

  it('combines names, options, and color identities without duplicates', () => {
    const primary = commander({ name: 'Tymna', colorIdentity: ['W', 'B'] });
    const partner = commander({ id: '2', name: 'Kraum', imageUrl: 'k.jpg', colorIdentity: ['U', 'R'] });
    expect(buildPairedCommanderName(primary, partner)).toBe('Tymna // Kraum');
    expect(buildPairedCommanderName(primary)).toBe('Tymna');
    expect(buildPairedCommanderColorFields(primary, partner)).toMatchObject({ color_identity: ['W', 'B', 'U', 'R'] });
    expect(buildPairedCommanderColorFields(primary, { ...partner, name: 'tymna' }).commander_options).toHaveLength(1);
  });
});
