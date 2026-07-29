import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APP_VERSION,
  FAN_CONTENT_NOTICE,
  getLegalContactEmail,
  getLegalContactLabel,
  LEGAL_BRAND_NAME,
  LEGAL_CONTROLLER_NAME,
  LEGAL_SITE_NAME,
  OFFICIAL_SUPPORT_EMAIL,
} from '@/lib/legal-site';
import { privacyPolicyDocument, termsOfUseDocument } from '@/lib/legal-documents';

function serializeDocument(document: unknown) {
  return JSON.stringify(document);
}

describe('legal-site', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exposes the current app version', () => {
    expect(APP_VERSION).toBe('7.0.0');
    expect(LEGAL_SITE_NAME).toBe('MTG Life Counter & Analytics: Commander');
    expect(LEGAL_BRAND_NAME).toBe('blackistoostrong');
  });

  it('uses the official support email by default', () => {
    expect(getLegalContactEmail()).toBe(OFFICIAL_SUPPORT_EMAIL);
    expect(getLegalContactLabel('it')).toBe(OFFICIAL_SUPPORT_EMAIL);
    expect(getLegalContactLabel('en')).toBe(OFFICIAL_SUPPORT_EMAIL);
  });

  it('allows overriding the support email via env', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPPORT_EMAIL', 'Help@Example.com');

    expect(getLegalContactEmail()).toBe('help@example.com');
  });

  it('identifies the natural-person controller only in the privacy document', () => {
    expect(serializeDocument(privacyPolicyDocument)).toContain(LEGAL_CONTROLLER_NAME);
    expect(serializeDocument(termsOfUseDocument)).not.toContain(LEGAL_CONTROLLER_NAME);
  });

  it('includes the exact Wizards fan-content notice in the terms', () => {
    expect(FAN_CONTENT_NOTICE).toContain('unofficial Fan Content permitted under the Fan Content Policy');
    expect(serializeDocument(termsOfUseDocument)).toContain(FAN_CONTENT_NOTICE);
  });
});
