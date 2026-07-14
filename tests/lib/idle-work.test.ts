import { afterEach, describe, expect, it, vi } from 'vitest';
import { runWhenIdle } from '@/lib/idle-work';

describe('idle-work', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('runs tasks immediately outside the browser', async () => {
    const task = vi.fn();

    runWhenIdle(task);

    expect(task).toHaveBeenCalledTimes(1);
  });

  it('falls back to setTimeout when requestIdleCallback is unavailable', () => {
    vi.useFakeTimers();

    const task = vi.fn();
    const originalWindow = globalThis.window;

    vi.stubGlobal('window', {
      setTimeout,
    } as Window & typeof globalThis);

    runWhenIdle(task, { timeoutMs: 1000 });
    expect(task).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(task).toHaveBeenCalledTimes(1);

    vi.stubGlobal('window', originalWindow);
  });
});