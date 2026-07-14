import { describe, expect, it, vi } from 'vitest';
import { isUsernameTaken } from '@/lib/register-user';

describe('register-user', () => {
  it('detects when a username is already taken', async () => {
    const adminClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { id: 'user-1' }, error: null })),
          })),
        })),
      })),
    };

    await expect(isUsernameTaken(adminClient as never, 'Marco')).resolves.toBe(true);
    expect(adminClient.from).toHaveBeenCalledWith('profiles');
  });

  it('allows unused usernames', async () => {
    const adminClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
      })),
    };

    await expect(isUsernameTaken(adminClient as never, 'new_player')).resolves.toBe(false);
  });
});