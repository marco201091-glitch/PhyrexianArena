import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getAvatarObjectState,
  getAvatarPublicUrl,
  resolveAvatarUrl,
} from '@/lib/avatar-storage';

function fakeClient(files: Array<Record<string, string>> = []) {
  return {
    storage: {
      from: () => ({
        list: async () => ({ data: files, error: null }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.example/${path}` },
        }),
      }),
    },
  } as unknown as SupabaseClient;
}

describe('avatar storage cache identity', () => {
  it('uses the durable object revision in the public URL', () => {
    const client = fakeClient();
    const url = getAvatarPublicUrl(client, 'user-1', 2, '2026-07-17T12:00:00Z');

    expect(url).toBe(
      'https://storage.example/user-1/avatar?v=2026-07-17T12%3A00%3A00Z-2',
    );
    expect(resolveAvatarUrl(client, 'user-1', false, 2, 'revision')).toBeNull();
  });

  it('reads avatar existence and revision from Storage metadata', async () => {
    const state = await getAvatarObjectState(fakeClient([
      { name: 'avatar', updated_at: '2026-07-17T12:00:00Z' },
    ]), 'user-1');

    expect(state).toEqual({
      exists: true,
      objectName: 'avatar',
      revision: '2026-07-17T12:00:00Z',
    });
  });

  it('uses the real legacy object name and avoids URLs for missing avatars', async () => {
    const client = fakeClient([{ name: 'avatar.png', created_at: '2026-01-01' }]);
    const state = await getAvatarObjectState(client, 'user-1');
    expect(state.objectName).toBe('avatar.png');
    expect(getAvatarPublicUrl(client, 'user-1', 1, state.revision, state.objectName!))
      .toContain('/user-1/avatar.png?');
    await expect(getAvatarObjectState(fakeClient(), 'user-1')).resolves.toEqual({
      exists: false, objectName: null, revision: null,
    });
  });
});
