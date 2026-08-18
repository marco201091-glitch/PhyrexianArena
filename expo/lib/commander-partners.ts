import { buildDeckColorFields, normalizeDeckColorIdentity } from '@/lib/deck-metadata';
import type { CommanderPartnerMode, CommanderSearchResult } from '@/lib/commander-types';

export function getCommanderPartnerMode(commander: CommanderSearchResult): CommanderPartnerMode | null {
  const typeLine = commander.typeLine.toLowerCase();
  const rulesText = `${commander.oracleText || ''} ${(commander.keywords || []).join(' ')}`.toLowerCase();

  if (typeLine.includes('background')) return 'background-owner';
  if (rulesText.includes('choose a background')) return 'background';
  if (typeLine.includes('doctor') && typeLine.includes('time lord')) return 'doctor-companion';
  if (rulesText.includes("doctor's companion")) return 'doctor';
  if (rulesText.includes('friends forever')) return 'friends';
  if (rulesText.includes('partner—father & son') || rulesText.includes('partner-father & son')) return 'father-son';
  if (rulesText.includes('partner—survivors') || rulesText.includes('partner-survivors')) return 'survivors';
  if (rulesText.includes('partner—character select') || rulesText.includes('partner-character select')) return 'character-select';

  const namedPartner = commander.oracleText.match(/partner with ([^(\n]+)/i)?.[1]?.trim();
  if (namedPartner) return `partner-with:${namedPartner}`;

  const partnerFamily = commander.oracleText.match(/partner[—-]\s*([^(\n]+)/i)?.[1]?.trim();
  if (partnerFamily) return `partner-family:${partnerFamily}`;

  if (rulesText.includes('partner') && !rulesText.includes("doctor's companion")) {
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

  if (mode.startsWith('partner-with:')) {
    const partnerName = mode.slice('partner-with:'.length);
    return {
      title: t({ it: `Partner con ${partnerName}`, en: `Partner with ${partnerName}` }),
      placeholder: t({ it: `Cerca ${partnerName}...`, en: `Search ${partnerName}...` }),
      empty: t({ it: 'Partner specifico non trovato', en: 'Named partner not found' }),
    };
  }

  if (mode.startsWith('partner-family:')) {
    const familyName = mode.slice('partner-family:'.length);
    return {
      title: familyName,
      placeholder: t({ it: `Cerca ${familyName}...`, en: `Search ${familyName}...` }),
      empty: t({ it: 'Nessun comandante compatibile trovato', en: 'No compatible commanders found' }),
    };
  }

  const variantLabel = mode === 'friends'
    ? 'Friends forever'
    : mode === 'father-son'
      ? 'Father & son'
      : mode === 'survivors'
        ? 'Survivors'
        : mode === 'character-select'
          ? 'Character select'
          : 'Partner';

  return {
    title: variantLabel,
    placeholder: t({ it: `Cerca ${variantLabel}...`, en: `Search ${variantLabel}...` }),
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
