'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getRememberMePreference, setRememberMePreference } from '@/lib/auth-persistence';
import { clearSupabaseAuthStorage } from '@/lib/supabase-auth-recovery';
import { resetSupabaseClient, supabase } from '@/lib/supabase';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ManaLogo } from '@/components/ui/mana-logo';
import { useLanguage } from '@/components/language-provider';
import { getSafeRedirectPath } from '@/lib/safe-redirect';
import { signInWithGoogle } from '@/lib/google-auth';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { DemoLoginButton } from '@/components/auth/demo-login-button';
import { AuthPageShell } from '@/components/legal/auth-page-shell';
import { useIsNativeApp } from '@/hooks/use-is-native-app';

function LoginForm() {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setRememberMe(getRememberMePreference());
  }, []);

  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { copy: t } = useLanguage();
  const isNative = useIsNativeApp();

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (!oauthError) return;

    toast({
      title: t({ it: 'Errore', en: 'Error' }),
      description: oauthError,
      variant: 'destructive',
    });
  }, [searchParams, t, toast]);
  const redirectPath = getSafeRedirectPath(searchParams.get('redirect'));
  const invalidCredentialsMessage = t({
    it: 'Credenziali non valide.',
    en: 'Invalid credentials.',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedIdentifier = loginIdentifier.trim();
      const isEmail = trimmedIdentifier.includes('@');
      let authEmail = trimmedIdentifier;

      if (!isEmail) {
        const { data, error } = await supabase.rpc('resolve_login_email', {
          identifier: trimmedIdentifier,
        });

        if (error) throw error;
        if (!data) {
          throw new Error(invalidCredentialsMessage);
        }

        authEmail = data;
      }

      setRememberMePreference(rememberMe);
      clearSupabaseAuthStorage();
      resetSupabaseClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          router.push(`/auth/resend-confirmation?email=${encodeURIComponent(authEmail)}`);
          return;
        }
        throw error;
      }

      router.refresh();
      router.push(redirectPath);
    } catch {
      toast({
        title: t({ it: 'Errore', en: 'Error' }),
        description: invalidCredentialsMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle(redirectPath);
    } catch (error: unknown) {
      toast({
        title: t({ it: 'Errore', en: 'Error' }),
        description: error instanceof Error
          ? error.message
          : t({ it: 'Accesso con Google non riuscito', en: 'Failed to sign in with Google' }),
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <Card className="w-full max-w-xl bg-card/80 border-border/50 backdrop-blur">
        <CardHeader className="pb-5 text-center">
          <div className="flex justify-center">
            <ManaLogo size="xl" showText layout="stacked" subtitle="EDH Tracker" className="w-full" />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="loginIdentifier" className="text-sm font-medium text-foreground">
                {t({ it: 'Email o nome utente', en: 'Email or username' })}
              </label>
              <Input
                id="loginIdentifier"
                type="text"
                autoComplete="username"
                placeholder={t({ it: 'ID utente o mail', en: 'User ID or email' })}
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
                className="bg-background/50 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  {t({ it: 'Password', en: 'Password' })}
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-medium text-violet-400 hover:text-violet-300"
                >
                  {t({ it: 'Password dimenticata?', en: 'Forgot password?' })}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/50 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <label
              htmlFor="rememberMe"
              className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border/60 bg-background/35 px-3 py-2.5 text-sm text-foreground"
            >
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                className="border-violet-400/70 data-[state=checked]:border-violet-400 data-[state=checked]:bg-violet-600"
              />
              <span>{t({ it: 'Ricordami su questo dispositivo', en: 'Remember me on this device' })}</span>
            </label>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white font-semibold"
              disabled={loading}
            >
              {loading
                ? t({ it: 'Accesso in corso...', en: 'Signing in...' })
                : t({ it: 'Entra nell\'arena', en: 'Enter Arena' })}
            </Button>
          </form>

          {!isNative && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t({ it: 'Oppure continua con', en: 'Or continue with' })}</span>
                </div>
              </div>

              <GoogleSignInButton disabled={loading} onClick={handleGoogleLogin} />

              <DemoLoginButton disabled={loading} redirectPath={redirectPath} />
              <Button asChild variant="outline" className="mt-3 w-full border-cyan-400/30 text-cyan-100">
                <Link href="/counter">Segnapunti senza account</Link>
              </Button>
            </>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t({ it: 'Non hai un account?', en: 'Not registered yet?' })}{' '}
            <Link href={`/auth/register?redirect=${encodeURIComponent(redirectPath)}`} className="text-violet-400 hover:text-violet-300 font-medium">
              {t({ it: 'Registrati', en: 'Create one' })}
            </Link>
          </div>

        </CardContent>
      </Card>
    </AuthPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
