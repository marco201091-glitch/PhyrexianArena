import { describe, expect, it } from 'vitest';
import { API_RATE_LIMITS } from '@/lib/api-rate-limit';

describe('api-rate-limit', () => {
  it('defines rate limits for protected API scopes', () => {
    expect(API_RATE_LIMITS.deckImport.maxRequests).toBe(200);
    expect(API_RATE_LIMITS.profileDeckRefresh.maxRequests).toBe(200);
    expect(API_RATE_LIMITS.authRegister.maxRequests).toBe(5);
    expect(API_RATE_LIMITS.archidektUserDecks.maxRequests).toBe(10);
  });
});