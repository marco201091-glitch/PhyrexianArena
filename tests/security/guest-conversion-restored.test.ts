import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const restored = readFileSync('supabase/migrations/20260730150000_restore_guest_conversion.sql', 'utf8').toLowerCase();

describe('guest-to-account conversion', () => {
  it('is restored after the temporary v7 removal and transfers history and decks', () => {
    expect(restored).toContain('create or replace function public.claim_arena_guest');
    expect(restored).toContain('update public.match_participants');
    expect(restored).toContain('insert into public.decks');
    expect(restored).toContain('delete from public.arena_guests');
    expect(restored).toContain('grant execute on function public.claim_arena_guest(text) to authenticated');
  });
});
