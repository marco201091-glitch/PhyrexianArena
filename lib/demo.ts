import type { User } from '@supabase/supabase-js';

export const DEMO_ACCOUNT_EMAIL = 'demo@phyrexianarena.local';
export const DEMO_ACCOUNT_USERNAME = 'demo';

export function isDemoModeEnabled() {
  return process.env.DEMO_MODE_ENABLED === 'true';
}

export function isPublicDemoModeEnabled() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export function isDemoUser(user: User | null | undefined) {
  return user?.app_metadata?.is_demo === true;
}

export function isDemoEmail(email: string) {
  return email.trim().toLowerCase() === DEMO_ACCOUNT_EMAIL;
}