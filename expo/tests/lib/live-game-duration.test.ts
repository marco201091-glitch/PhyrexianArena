import { describe, expect, it } from 'vitest';
import { formatGameDuration, getGameDurationSeconds } from '@/lib/live-game-duration';

describe('live game duration', () => {
  it('calculates a crash-safe duration from persisted timestamps', () => {
    expect(getGameDurationSeconds(
      '2026-07-14T10:00:00.000Z',
      '2026-07-14T11:05:09.000Z',
    )).toBe(3909);
  });

  it('formats short and long games compactly', () => {
    expect(formatGameDuration(42)).toBe('42s');
    expect(formatGameDuration(1455)).toBe('24m 15s');
    expect(formatGameDuration(3909)).toBe('1h 05m');
  });
});
