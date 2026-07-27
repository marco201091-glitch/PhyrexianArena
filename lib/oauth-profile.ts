import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isValidUsername } from '@/lib/auth-validation';

export function deriveUsernameFromEmail(email: string) {
  const localPart = email.split('@')[0] || '';
  const normalized = localPart
    .toLowerCase()
    .replace(/\./g, '_')
    .replace(/[^a-z0-9_]/g, '');
  return normalized.length < 3 ? 'user' : normalized.slice(0, 30);
}

export function isGoogleAuthUser(user: Pick<User, 'app_metadata' | 'identities'> | null | undefined) {
  if (!user) return false;
  if (user.app_metadata?.provider === 'google') return true;
  return Boolean(user.identities?.some((identity) => identity.provider === 'google'));
}

async function findAvailableUsername(
  supabase: SupabaseClient,
  baseUsername: string,
  userId: string,
) {
  let candidate = baseUsername;
  let suffix = 0;
  while (suffix <= 999) {
    const { data: existing, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();
    if (error) throw error;
    if (!existing || existing.id === userId) return candidate;
    suffix += 1;
    candidate = `${baseUsername.slice(0, 24)}_${suffix}`;
  }
  return `user_${userId.replace(/-/g, '').slice(0, 8)}`;
}

export async function ensureOAuthUserProfile(
  supabase: SupabaseClient,
  user: User,
) {
  if (!isGoogleAuthUser(user) || !user.email) return;

  const desiredBase = deriveUsernameFromEmail(user.email);
  if (!isValidUsername(desiredBase)) return;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  const username = await findAvailableUsername(supabase, desiredBase, user.id);
  if (!profile) {
    const { error } = await supabase.from('profiles').insert({ id: user.id, username });
    if (error) throw error;
    return;
  }

  const legacyUsername = user.email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (profile.username === legacyUsername && profile.username !== username) {
    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.id);
    if (error) throw error;
  }
}
