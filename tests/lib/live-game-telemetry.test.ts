import { describe, expect, it } from 'vitest';
import {
  LIVE_GAME_TELEMETRY_PERSIST_INTERVAL_MS,
  sanitizeLiveGameTelemetryError,
  shouldPersistLiveGameTelemetry,
} from '@/lib/live-game-telemetry';

describe('live-game telemetry', () => {
  it('redacts identifiers and contact data from diagnostics', () => {
    const sanitized = sanitizeLiveGameTelemetryError(
      'Sync user@example.com 123e4567-e89b-42d3-a456-426614174000 at https://example.com/path?token=secret',
    );
    expect(sanitized).toBe('Sync [email] [id] at [url]');
  });

  it('bounds stored errors', () => {
    expect(sanitizeLiveGameTelemetryError('x'.repeat(500))).toHaveLength(300);
  });

  it('persists at most once per minute unless explicitly forced', () => {
    const lastPersistedAt = 10_000;
    expect(shouldPersistLiveGameTelemetry({
      lastPersistedAt,
      now: lastPersistedAt + LIVE_GAME_TELEMETRY_PERSIST_INTERVAL_MS - 1,
    })).toBe(false);
    expect(shouldPersistLiveGameTelemetry({
      lastPersistedAt,
      now: lastPersistedAt + LIVE_GAME_TELEMETRY_PERSIST_INTERVAL_MS,
    })).toBe(true);
    expect(shouldPersistLiveGameTelemetry({
      lastPersistedAt,
      now: lastPersistedAt + 1,
      force: true,
    })).toBe(true);
  });
});
