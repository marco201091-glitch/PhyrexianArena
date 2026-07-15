import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSafeRedirectPath } from '@/lib/safe-redirect';
import { LoginForm } from './login-form';

type LoginPageProps = {
  searchParams: Promise<{
    redirect?: string;
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect(getSafeRedirectPath(params.redirect));
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}