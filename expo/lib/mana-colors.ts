import type { ImageSourcePropType } from 'react-native';
export {
  getColorIdentityGroupKey,
  getColorIdentityLabel,
  getPlayableManaColors,
  MANA_CHART_COLORS,
  MANA_COLOR_LABELS,
  MANA_COLOR_ORDER,
} from '@/lib/mana-colors-core';

/** Official-style mana symbol SVGs from Scryfall's symbology API (web). */
export const MANA_SYMBOL_SVG_URLS: Record<string, string> = {
  W: 'https://svgs.scryfall.io/card-symbols/W.svg',
  U: 'https://svgs.scryfall.io/card-symbols/U.svg',
  B: 'https://svgs.scryfall.io/card-symbols/B.svg',
  R: 'https://svgs.scryfall.io/card-symbols/R.svg',
  G: 'https://svgs.scryfall.io/card-symbols/G.svg',
  C: 'https://svgs.scryfall.io/card-symbols/C.svg',
};

/** Bundled PNG symbols for React Native (SVG remote URIs are not supported). */
export const MANA_SYMBOL_IMAGES: Record<string, ImageSourcePropType> = {
  W: require('@/assets/mana/W.png'),
  U: require('@/assets/mana/U.png'),
  B: require('@/assets/mana/B.png'),
  R: require('@/assets/mana/R.png'),
  G: require('@/assets/mana/G.png'),
  C: require('@/assets/mana/C.png'),
};

export function getManaSymbolSvgUrl(color: string) {
  return MANA_SYMBOL_SVG_URLS[color] || MANA_SYMBOL_SVG_URLS.C;
}

export function getManaSymbolImageSource(color: string): ImageSourcePropType {
  return MANA_SYMBOL_IMAGES[color] || MANA_SYMBOL_IMAGES.C;
}
