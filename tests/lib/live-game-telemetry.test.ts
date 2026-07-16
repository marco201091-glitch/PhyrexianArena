import { describe, expect, it } from 'vitest';
import { sanitizeLiveGameTelemetryError } from '@/lib/live-game-telemetry';

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
});
