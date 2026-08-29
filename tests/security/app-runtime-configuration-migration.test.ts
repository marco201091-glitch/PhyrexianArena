import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260829093212_app_runtime_configuration.sql'),
  'utf8',
);

describe('app runtime configuration migration', () => {
  it('is additive, service-role-only, indexed, and keeps 8.1 supported', () => {
    expect(migration).toContain("minimum_supported_version text NOT NULL DEFAULT '8.1.0'");
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('REVOKE ALL ON TABLE public.app_runtime_configuration FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('notification_delivery_attempts_user_id_attempted_at_idx');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });
});
