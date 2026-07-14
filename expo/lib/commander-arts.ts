import { apiGet } from '@/lib/api';
import type { CommanderArtOption } from '@/lib/commander-types';
import { fetchCommanderArtOptionsDirect } from '@/lib/scryfall-search';

export async function fetchCommanderArtOptions(
  commanderName: string,
  signal?: AbortSignal,
): Promise<CommanderArtOption[]> {
  const trimmed = commanderName.trim();
  if (trimmed.length < 2) return [];

  try {
    const directResults = await fetchCommanderArtOptionsDirect(trimmed, signal);
    if (directResults.length > 0) {
      return directResults;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
  }

  const params = new URLSearchParams({ name: trimmed });
  const { data, status } = await apiGet<{ data?: CommanderArtOption[]; error?: string }>(
    `/api/scryfall-card-arts?${params.toString()}`,
  );

  if (status !== 200) return [];
  return Array.isArray(data?.data) ? data.data : [];
}