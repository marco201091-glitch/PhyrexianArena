import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { applyUserRateLimit } from '@/app/api/_lib/with-rate-limit';
import { fetchCommanderCmc } from '@/lib/scryfall';

const MAX_NAMES = 40;
const SCRYFALL_GAP_MS = 100;

function normalizeNames(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(
    value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length >= 2),
  )).slice(0, MAX_NAMES);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;

  const rateLimited = await applyUserRateLimit(auth.user, 'scryfall');
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const names = normalizeNames((body as { names?: unknown })?.names);
  if (names.length === 0) {
    return NextResponse.json({ cmcs: {} });
  }

  const cmcs: Record<string, number | null> = {};

  for (const name of names) {
    try {
      cmcs[name] = await fetchCommanderCmc(name);
    } catch (error) {
      console.error('Scryfall CMC lookup error:', name, error);
      cmcs[name] = null;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, SCRYFALL_GAP_MS);
    });
  }

  return NextResponse.json({ cmcs });
}