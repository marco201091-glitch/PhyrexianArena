import { describe, expect, it, vi } from 'vitest';
import { fetchGroupByInviteCode, normalizeInviteCode } from '@/lib/join-arena';

describe('join arena', () => {
  it('normalizes invite codes for mobile keyboard input', () => {
    expect(normalizeInviteCode(' ab-c12 ')).toBe('AB-C12');
  });

  it('accepts RPC array and object payloads and returns null for empty results', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: [{ id: 'g1', name: 'Arena', description: null }], error: null })
      .mockResolvedValueOnce({ data: { id: 'g2', name: 'Arena 2', description: null }, error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    const client = { rpc } as never;
    expect(await fetchGroupByInviteCode(client, ' abc ')).toMatchObject({ id: 'g1' });
    expect(await fetchGroupByInviteCode(client, 'def')).toMatchObject({ id: 'g2' });
    expect(await fetchGroupByInviteCode(client, 'none')).toBeNull();
    expect(rpc).toHaveBeenNthCalledWith(1, 'get_group_by_invite_code', { p_invite_code: 'ABC' });
  });

  it('propagates RPC errors to the screen', async () => {
    const error = new Error('offline');
    const client = { rpc: vi.fn().mockResolvedValue({ data: null, error }) } as never;
    await expect(fetchGroupByInviteCode(client, 'abc')).rejects.toBe(error);
  });
});
