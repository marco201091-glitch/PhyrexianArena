import { fetchCommanderImage } from '@/lib/scryfall';

export async function resolveCommanderImage(commanderName: string) {
  return fetchCommanderImage(commanderName);
}