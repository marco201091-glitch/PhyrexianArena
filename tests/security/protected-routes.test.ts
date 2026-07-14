import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

const protectedRoutes = [
  'app/api/deck-import/route.ts',
  'app/api/archidekt-user-decks/route.ts',
  'app/api/scryfall-commanders/route.ts',
  'app/api/scryfall-card-arts/route.ts',
  'app/api/edhrec-commander/route.ts',
  'app/api/edhrec-resolve/route.ts',
  'app/api/profile/deck-refresh-budget/route.ts',
];

const authenticatedFetchClients = [
  'app/profile/page.tsx',
  'app/table/[id]/page.tsx',
  'lib/deck-color-sync.ts',
  'components/deck/edhrec-badge.tsx',
  'components/arena/guest-commander-picker.tsx',
];

describe('protected routes', () => {
  it('requires auth on sensitive API routes', () => {
    for (const routePath of protectedRoutes) {
      const source = readFileSync(join(root, routePath), 'utf8');
      expect(source, routePath).toMatch(/requireAuthOr401|createServerSupabaseClient/);
    }
  });

  it('uses authenticatedFetch in protected client modules', () => {
    for (const filePath of authenticatedFetchClients) {
      const source = readFileSync(join(root, filePath), 'utf8');
      expect(source, filePath).toMatch(/authenticatedFetch/);
    }
  });
});