import { enforceUserRateLimit, type API_RATE_LIMITS } from '@/lib/api-rate-limit';

type RateLimitScope = keyof typeof API_RATE_LIMITS;

export async function applyUserRateLimitById(userId: string, scope: RateLimitScope) {
  return enforceUserRateLimit(userId, scope);
}