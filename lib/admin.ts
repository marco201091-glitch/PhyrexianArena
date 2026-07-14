import type { SupabaseClient, User } from '@supabase/supabase-js';

const configuredAdminEmails = (process.env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS || process.env.PLATFORM_ADMIN_EMAILS || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

export function getConfiguredPlatformAdminEmails() {
  return configuredAdminEmails;
}

export function isAdministrator(user: Pick<User, 'email'> | null | undefined) {
  if (!user || configuredAdminEmails.length === 0) return false;

  const email = typeof user.email === 'string' ? user.email.toLowerCase() : '';
  return configuredAdminEmails.includes(email);
}

export async function isPlatformAdministrator(
  supabase: SupabaseClient,
  user: Pick<User, 'id' | 'email'> | null | undefined,
) {
  if (!user) return false;
  if (isAdministrator(user)) return true;

  const { data, error } = await supabase.rpc('is_admin', { p_user_id: user.id });
  if (error) {
    console.error('is_admin rpc failed:', error.message);
    return false;
  }

  return data === true;
}
