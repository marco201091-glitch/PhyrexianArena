import type { SupabaseClient } from '@supabase/supabase-js';

interface RegisterUserInput {
  email: string;
  password: string;
  username: string;
}

export async function isUsernameTaken(adminClient: SupabaseClient, username: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const { data, error } = await adminClient
    .from('profiles')
    .select('id')
    .eq('username', normalizedUsername)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function registerUserWithoutEmailConfirmation(
  adminClient: SupabaseClient,
  { email, password, username }: RegisterUserInput,
) {
  const normalizedUsername = username.trim().toLowerCase();

  if (await isUsernameTaken(adminClient, normalizedUsername)) {
    throw new Error('This username is already taken.');
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: normalizedUsername,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('User account was not created.');
  }

  return data.user;
}