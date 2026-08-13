import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAvatarObjectState, resolveAvatarUrl } from '@/lib/avatar-storage';

function clientWith(files: Array<Record<string, string>>) {
  return {
    storage: { from: () => ({
      list: async () => ({ data: files, error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${path}` } }),
    }) },
  } as unknown as SupabaseClient;
}

describe('web avatar storage resolution', () => {
  it('does not construct a request when the user has no avatar', async () => {
    const client = clientWith([]);
    const state = await getAvatarObjectState(client, 'user-a');
    expect(state).toEqual({ exists: false, objectName: null, revision: null });
    expect(resolveAvatarUrl(client, 'user-a', state, 1)).toBeNull();
  });

  it('resolves current and legacy object names exactly', async () => {
    for (const objectName of ['avatar', 'avatar.jpg', 'avatar.png']) {
      const client = clientWith([{ name: objectName, updated_at: 'revision' }]);
      const state = await getAvatarObjectState(client, 'user-a');
      expect(resolveAvatarUrl(client, 'user-a', state, 2))
        .toBe(`https://storage.test/user-a/${objectName}?v=revision-2`);
    }
  });
});
