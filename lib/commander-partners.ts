import { buildDeckColorFields, normalizeDeckColorIdentity } from '@/lib/deck-metadata';
import type { CommanderPartnerMode, CommanderSearchResult } from '@/lib/scryfall';

export function getCommanderPartnerMode(commander: CommanderSearchResult): CommanderPartnerMode | null {
  const typeLine = commander.typeLine.toLowerCase();
  const rulesText = `${commander.oracleText || ''} ${(commander.keywords || []).join(' ')}`.toLowerCase();

  if (typeLine.includes('background')) return 'background-owner';
  if (rulesText.includes('choose a background')) return 'background';
  if (typeLine.includes('doctor') && typeLine.includes('time lord')) return 'doctor-companion';
  if (rulesText.includes("doctor's companion")) return 'doctor';
  if (rulesText.includes('friends forever')) return 'friends';
  if (rulesText.includes('partner') && !rulesText.includes('partner with') && !rulesText.includes("doctor's companion")) {
    return 'partner';
  }

  return null;
}

type CopyFn = (value: { it: string; en: string }) => string;

export function getCommanderPartnerCopy(mode: CommanderPartnerMode, t: CopyFn) {
  if (mode === 'background') {
    return {
      title: t({ it: 'Background', en: 'Background' }),
      placeholder: t({ it: 'Cerca background...', en: 'Search background...' }),
      empty: t({ it: 'Nessun background trovato', en: 'No backgrounds found' }),
    };
  }

  if (mode === 'background-owner') {
    return {
      title: t({ it: 'Comandante con Background', en: 'Background commander' }),
      placeholder: t({ it: 'Cerca comandante con Choose a Background...', en: 'Search Choose a Background commander...' }),
      empty: t({ it: 'Nessun comandante compatibile trovato', en: 'No compatible commanders found' }),
    };
  }

  if (mode === 'doctor') {
    return {
      title: t({ it: 'Dottore', en: 'Doctor' }),
      placeholder: t({ it: 'Cerca Dottore...', en: 'Search Doctor...' }),
      empty: t({ it: 'Nessun Dottore trovato', en: 'No Doctors found' }),
    };
  }

  if (mode === 'doctor-companion') {
    return {
      title: t({ it: 'Doctor companion', en: 'Doctor companion' }),
      placeholder: t({ it: 'Cerca Doctor companion...', en: 'Search Doctor companion...' }),
      empty: t({ it: 'Nessun companion trovato', en: 'No companions found' }),
    };
  }

  return {
    title: t({ it: mode === 'friends' ? 'Friends forever' : 'Partner', en: mode === 'friends' ? 'Friends forever' : 'Partner' }),
    placeholder: t({ it: mode === 'friends' ? 'Cerca Friends forever...' : 'Cerca partner...', en: mode === 'friends' ? 'Search Friends forever...' : 'Search partner...' }),
    empty: t({ it: 'Nessun secondo comandante trovato', en: 'No second commander found' }),
  };
}

export function buildPairedCommanderName(
  primary: CommanderSearchResult,
  partner?: CommanderSearchResult | null,
) {
  return partner ? `${primary.name} // ${partner.name}` : primary.name;
}

export function buildPairedCommanderColorFields(
  primary: CommanderSearchResult,
  partner?: CommanderSearchResult | null,
) {
  const commanderOptions = [
    {
      name: primary.name,
      imageUrl: primary.imageUrl,
      colorIdentity: normalizeDeckColorIdentity(primary.colorIdentity),
    },
    ...(partner ? [{
      name: partner.name,
      imageUrl: partner.imageUrl,
      colorIdentity: normalizeDeckColorIdentity(partner.colorIdentity),
    }] : []),
  ].filter((option, index, allOptions) =>
    option.name &&
    allOptions.findIndex((candidate) => candidate.name.toLowerCase() === option.name.toLowerCase()) === index
  );

  return buildDeckColorFields(commanderOptions);
}