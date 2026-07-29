import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscribeToArenaCatalog } from '@/lib/arena-catalog-realtime';

describe('arena catalog realtime', () => {
  afterEach(() => vi.useRealTimers());

  it('uses a private arena channel, coalesces bursts, and cleans up', async () => {
    vi.useFakeTimers();
    let broadcastHandler: ((message: { payload: unknown }) => void) | null = null;
    const subscribe = vi.fn();
    const channel = {
      on: vi.fn((_type, _filter, handler) => {
        broadcastHandler = handler;
        return channel;
      }),
      subscribe,
    };
    const client = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn().mockResolvedValue('ok'),
      realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
    };
    const onChange = vi.fn();

    const unsubscribe = subscribeToArenaCatalog(
      client as never,
      '11111111-1111-1111-1111-111111111111',
      onChange,
    );
    await Promise.resolve();

    expect(client.channel).toHaveBeenCalledWith(
      'arena:11111111-1111-1111-1111-111111111111:catalog',
      { config: { private: true } },
    );
    expect(client.realtime.setAuth).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(1);

    broadcastHandler!({ payload: { entity: 'deck', operation: 'INSERT', id: '1' } });
    broadcastHandler!({ payload: { entity: 'deck', operation: 'UPDATE', id: '1' } });
    await vi.advanceTimersByTimeAsync(120);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ entity: 'deck', operation: 'UPDATE', id: '1' });

    unsubscribe();
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
  });
});
