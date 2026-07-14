import type { SupabaseClient } from '@supabase/supabase-js';
import { buildAuthCallbackUrl, buildPasswordResetUrl } from '@/lib/auth-site-url';

interface SignupLinkInput {
  email: string;
  password: string;
  username: string;
  siteUrl: string;
}

interface RecoveryLinkInput {
  email: string;
  siteUrl: string;
}

export async function createSignupConfirmationLink(
  adminClient: SupabaseClient,
  { email, password, username, siteUrl }: SignupLinkInput,
) {
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      redirectTo: buildAuthCallbackUrl(siteUrl, '/dashboard'),
      data: {
        username,
      },
    },
  });

  if (error) {
    throw error;
  }

  const actionLink = data.properties?.action_link;
  if (!actionLink) {
    throw new Error('Signup confirmation link was not generated');
  }

  return actionLink;
}

export async function createSignupConfirmationLinkForExistingUser(
  adminClient: SupabaseClient,
  email: string,
  siteUrl: string,
) {
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: buildAuthCallbackUrl(siteUrl, '/dashboard'),
    },
  });

  if (error) {
    throw error;
  }

  const actionLink = data.properties?.action_link;
  if (!actionLink) {
    throw new Error('Signup confirmation link was not generated');
  }

  return actionLink;
}

export async function createPasswordRecoveryLink(
  adminClient: SupabaseClient,
  { email, siteUrl }: RecoveryLinkInput,
) {
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: buildPasswordResetUrl(siteUrl),
    },
  });

  if (error) {
    throw error;
  }

  const actionLink = data.properties?.action_link;
  if (!actionLink) {
    throw new Error('Password recovery link was not generated');
  }

  return actionLink;
}

export async function findAuthUserByEmail(adminClient: SupabaseClient, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}