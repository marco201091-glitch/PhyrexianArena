const OPTIMIZED_IMAGE_HOSTS = new Set(['cards.scryfall.io']);

export function isOptimizableDeckImageUrl(src: string) {
  try {
    return OPTIMIZED_IMAGE_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}