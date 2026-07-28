import { describe, expect, it } from 'vitest';
import {
  getAvatarObjectState,
  getAvatarPublicUrl,
  resolveAvatarUrl,
} from '@/lib/avatar-storage';

function fakeClient(files: Array<Record<string, string>>) {
  return {
    storage: {
      from: () => ({
        list: async () => ({ data: files, error: null }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.example/${path}` },
        }),
      }),
    },
  } as never;
}

describe('avatar storage', () => {
  it('does not build a public URL when no avatar exists', async () => {
    const client = fakeClient([]);
    await expect(getAvatarObjectState(client, 'user-1')).resolves.toEqual({
      exists: false,
      objectName: null,
      revision: null,
    });
    expect(resolveAvatarUrl(client, 'user-1', null, 1)).toBeNull();
  });

  it('uses the actual legacy object name', async () => {
    const client = fakeClient([{
      name: 'avatar.jpg',
      updated_at: '2026-07-17T12:00:00Z',
    }]);
    await expect(getAvatarObjectState(client, 'user-1')).resolves.toMatchObject({
      exists: true,
      objectName: 'avatar.jpg',
    });
    expect(getAvatarPublicUrl(client, 'user-1', 'avatar.jpg', 2, 'revision'))
      .toBe('https://storage.example/user-1/avatar.jpg?v=revision-2');
  });
});
