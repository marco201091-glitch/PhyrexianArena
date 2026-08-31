import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260829083951_access_logs_app_version.sql'),
  'utf8',
);

describe('access log app-version migration', () => {
  it('stores validated versions and keeps web entries versionless', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS app_version text');
    expect(migration).toContain("WHEN normalized_source = 'app'");
    expect(migration).toContain("CASE WHEN al.source = 'app' THEN al.app_version ELSE NULL END");
  });

  it('keeps write access service-only and history admin-only', () => {
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.record_user_access(uuid, text, text) FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
    expect(migration).toContain('IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid())');
    expect(migration).toContain('TO authenticated');
  });
});
