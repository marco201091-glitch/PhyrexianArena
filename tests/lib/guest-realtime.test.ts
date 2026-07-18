import { describe, expect, it, vi } from 'vitest';
import { buildGuestRealtimeTopic, subscribeGuestRealtime } from '@/lib/guest-realtime';

describe('guest realtime adapter', () => {
  const secret = 'a'.repeat(48);

  it('namespaces unguessable topics per session kind', () => {
    expect(buildGuestRealtimeTopic('game', secret)).toBe(`game:${secret}`);
    expect(buildGuestRealtimeTopic('counter', secret)).toBe(`counter:${secret}`);
    expect(() => buildGuestRealtimeTopic('game', 'short')).toThrow('Invalid realtime topic');
  });

  it('subscribes to state broadcast and removes channel on cleanup', () => {
    const subscribe = vi.fn();
    const channel = { on: vi.fn(), subscribe };
    channel.on.mockReturnValue(channel);
    subscribe.mockReturnValue(channel);
    const client = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    };
    const onState = vi.fn();
    const cleanup = subscribeGuestRealtime(client as never, { scope: 'counter', secret, onState });

    expect(client.channel).toHaveBeenCalledWith(`counter:${secret}`);
    expect(channel.on).toHaveBeenCalledWith('broadcast', { event: 'state' }, onState);
    expect(subscribe).toHaveBeenCalledOnce();
    cleanup();
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
  });
});
