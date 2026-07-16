import { describe, expect, it, vi } from 'vitest';
import { getAvatarPublicUrl, resolveAvatarUrl, userHasAvatar } from '@/lib/avatar-storage';

function clientWithFiles(files: Array<{ name: string }> | null, error: unknown = null) {
  const list = vi.fn().mockResolvedValue({ data: files, error });
  const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example/avatar' } });
  const from = vi.fn().mockReturnValue({ list, getPublicUrl });
  return { client: { storage: { from } } as never, from, list, getPublicUrl };
}

describe('avatar storage', () => {
  it('detects extensionless and extended avatar object names', async () => {
    const exact = clientWithFiles([{ name: 'avatar' }]);
    const extended = clientWithFiles([{ name: 'avatar.jpeg' }]);
    expect(await userHasAvatar(exact.client, 'u1')).toBe(true);
    expect(await userHasAvatar(extended.client, 'u1')).toBe(true);
    expect(exact.list).toHaveBeenCalledWith('u1', { limit: 20 });
  });

  it('treats errors and unrelated objects as no avatar', async () => {
    expect(await userHasAvatar(clientWithFiles([{ name: 'cover.jpg' }]).client, 'u')).toBe(false);
    expect(await userHasAvatar(clientWithFiles(null, new Error('offline')).client, 'u')).toBe(false);
  });

  it('builds a versioned URL only for visible avatars', () => {
    const { client, getPublicUrl } = clientWithFiles([]);
    expect(getAvatarPublicUrl(client, 'u1', 7)).toBe('https://cdn.example/avatar?v=7');
    expect(getPublicUrl).toHaveBeenCalledWith('u1/avatar');
    expect(resolveAvatarUrl(client, 'u1', true, 8)).toBe('https://cdn.example/avatar?v=8');
    expect(resolveAvatarUrl(client, undefined, true, 8)).toBeNull();
    expect(resolveAvatarUrl(client, 'u1', false, 8)).toBeNull();
  });
});
