import type { User } from '@supabase/supabase-js';
import { enforceIpRateLimit, enforceUserRateLimit, type API_RATE_LIMITS } from '@/lib/api-rate-limit';

type RateLimitScope = keyof typeof API_RATE_LIMITS;

export async function applyUserRateLimit(user: User, scope: RateLimitScope) {
  return enforceUserRateLimit(user.id, scope);
}

export async function applyIpRateLimit(request: Request, scope: RateLimitScope) {
  return enforceIpRateLimit(request, scope);
}