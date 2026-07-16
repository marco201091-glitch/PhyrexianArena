export const MANA_COLOR_LABELS: Record<string, { it: string; en: string }> = {
  W: { it: 'Bianco', en: 'White' },
  U: { it: 'Blu', en: 'Blue' },
  B: { it: 'Nero', en: 'Black' },
  R: { it: 'Rosso', en: 'Red' },
  G: { it: 'Verde', en: 'Green' },
  C: { it: 'Incolore', en: 'Colorless' },
};

export const MANA_CHART_COLORS: Record<string, string> = {
  W: '#e7e5e4',
  U: '#0ea5e9',
  B: '#3f3f46',
  R: '#dc2626',
  G: '#16a34a',
  C: '#cbd5e1',
};

export const MANA_COLOR_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'] as const;

const TWO_COLOR_GUILD_NAMES: Record<string, { it: string; en: string }> = {
  'U-W': { it: 'Azorius', en: 'Azorius' },
  'B-U': { it: 'Dimir', en: 'Dimir' },
  'R-B': { it: 'Rakdos', en: 'Rakdos' },
  'G-R': { it: 'Gruul', en: 'Gruul' },
  'W-G': { it: 'Selesnya', en: 'Selesnya' },
  'B-W': { it: 'Orzhov', en: 'Orzhov' },
  'R-U': { it: 'Izzet', en: 'Izzet' },
  'G-B': { it: 'Golgari', en: 'Golgari' },
  'W-R': { it: 'Boros', en: 'Boros' },
  'U-G': { it: 'Simic', en: 'Simic' },
};

const THREE_COLOR_IDENTITY_NAMES: Record<string, { it: string; en: string }> = {
  'G-R-W': { it: 'Naya', en: 'Naya' },
  'B-R-U': { it: 'Grixis', en: 'Grixis' },
  'B-U-W': { it: 'Esper', en: 'Esper' },
  'B-G-R': { it: 'Jund', en: 'Jund' },
  'G-U-W': { it: 'Bant', en: 'Bant' },
  'B-G-W': { it: 'Abzan', en: 'Abzan' },
  'R-U-W': { it: 'Jeskai', en: 'Jeskai' },
  'B-G-U': { it: 'Sultai', en: 'Sultai' },
  'B-R-W': { it: 'Mardu', en: 'Mardu' },
  'G-R-U': { it: 'Temur', en: 'Temur' },
};

const FIVE_COLOR_LABEL = { it: 'Pentacolor', en: 'Pentacolor' };

export function getPlayableManaColors(colors: string[]) {
  return colors.filter((color) => color !== 'C');
}

export function getColorIdentityLabel(colors: string[]) {
  const playable = getPlayableManaColors(colors);
  const playableCount = playable.length;
  if (playableCount < 2) return null;
  if (playableCount === 5) return FIVE_COLOR_LABEL;

  const key = [...playable].sort().join('-');
  if (playableCount === 2) return TWO_COLOR_GUILD_NAMES[key] || null;
  if (playableCount === 3) return THREE_COLOR_IDENTITY_NAMES[key] || null;
  return null;
}

export function getColorIdentityGroupKey(colors: string[]) {
  const playable = getPlayableManaColors(colors);
  const count = playable.length;
  if (count < 2) return null;
  if (count === 5) return 'identity:pentacolor';
  const sortedKey = [...playable].sort().join('-');
  if (count === 2) return `identity:guild:${sortedKey}`;
  if (count === 3) return `identity:shard:${sortedKey}`;
  if (count === 4) return `identity:four:${sortedKey}`;
  return `identity:multi:${sortedKey}`;
}
