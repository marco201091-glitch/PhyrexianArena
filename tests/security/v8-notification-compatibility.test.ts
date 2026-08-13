import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('V8 notification compatibility', () => {
  it('keeps preferences additive and defaulted to the legacy enabled behavior', () => {
    const migration = read('supabase/migrations/20260813071326_notification_preferences_and_inbox.sql');
    expect(migration).toContain('create table public.notification_preferences');
    for (const preference of ['arena_invite', 'arena_member_joined', 'match_completed', 'push_enabled']) {
      expect(migration).toMatch(new RegExp(`${preference} boolean not null default true`));
    }
    expect(migration).not.toMatch(/drop\s+(table|column)|alter\s+column\s+.*type/i);
  });

  it('targets completed-match alerts only to registered match participants', () => {
    const route = read('app/api/notifications/match-completed/route.ts');
    expect(route).toContain("from('match_participants')");
    expect(route).toContain("select('user_id')");
    expect(route).not.toContain("from('group_members')");
    expect(route).toContain('participantIds.includes(auth.user.id)');
  });
});
