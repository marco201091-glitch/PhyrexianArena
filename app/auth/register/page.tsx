'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PasswordRequirements, isPasswordPolicyValid } from '@/components/auth/password-requirements';
import { isValidEmail, isValidUsername } from '@/lib/auth-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ManaLogo } from '@/components/ui/mana-logo';
import { useLanguage } from '@/components/language-provider';
import { TurnstileWidget } from '@/components/turnstile-widget';
import { getSafeRedirectPath } from '@/lib/safe-redirect';
import { signInWithGoogle } from '@/lib/google-auth';
import { supabase } from '@/lib/supabase';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { AuthPageShell } from '@/components/legal/auth-page-shell';
import { RegisterTermsNotice } from '@/components/legal/register-terms-notice';
import { useIsNativeApp } from '@/hooks/use-is-native-app';

function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [captchaAvailable, setCaptchaAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { copy: t, language } = useLanguage();
  const isNative = useIsNativeApp();
  const redirectPath = getSafeRedirectPath(searchParams.get('redirect'));
  const isPasswordValid = isPasswordPolicyValid(password);
  const isEmailValid = isValidEmail(email);
  const isUsernameValid = isValidUsername(username);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isCaptchaReady = Boolean(turnstileSiteKey && captchaToken && captchaAvailable);

  const resetCaptcha = () => {
    setCaptchaToken('');
    setCaptchaResetSignal((signal) => signal + 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEmailValid) {
      toast({
        title: t({ it: 'Email non valida', en: 'Invalid email' }),
        description: t({ it: 'Inserisci un indirizzo email valido.', en: 'Enter a valid email address.' }),
      });
      return;
    }

    if (!isUsernameValid) {
      toast({
        title: t({ it: 'Nome utente non valido', en: 'Invalid username' }),
        description: t({
          it: 'Usa 3-30 caratteri: lettere, numeri o underscore.',
          en: 'Use 3-30 characters: letters, numbers, or underscores.',
        }),
        variant: 'destructive',
      });
      return;
    }

    if (!isPasswordValid) {
      toast({
        title: t({ it: 'Password troppo debole', en: 'Password too weak' }),
        description: t({
          it: 'Usa almeno 8 caratteri, una maiuscola, una minuscola e un numero.',
          en: 'Use at least 8 characters, one uppercase letter, one lowercase letter, and one number.',
        }),
        variant: 'destructive',
      });
      return;
    }

    if (!isCaptchaReady) {
      toast({
        title: t({ it: 'Verifica richiesta', en: 'Verification required' }),
        description: t({
          it: 'Completa il captcha prima di creare l\'account.',
          en: 'Complete the captcha before creating your account.',
        }),
      });
      return;
    }

    setLoading(true);

    try {
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          username: username.trim(),
          captchaToken,
          locale: language,
        }),
      });

      const registerData = await registerResponse.json() as { error?: string };
      if (!registerResponse.ok) {
        throw new Error(registerData.error || t({ it: 'Creazione account non riuscita', en: 'Failed to create account' }));
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      toast({
        title: t({ it: 'Account creato', en: 'Account created' }),
        description: t({
          it: 'Registrazione completata. Ti stiamo portando alla dashboard.',
          en: 'Registration complete. Taking you to the dashboard.',
        }),
      });
      router.push(redirectPath);
    } catch (error: unknown) {
      resetCaptcha();
      toast({
        title: t({ it: 'Errore', en: 'Error' }),
        description: error instanceof Error ? error.message : t({ it: 'Creazione account non riuscita', en: 'Failed to create account' }),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    try {
      await signInWithGoogle(redirectPath);
    } catch (error: unknown) {
      toast({
        title: t({ it: 'Errore', en: 'Error' }),
        description: error instanceof Error
          ? error.message
          : t({ it: 'Registrazione con Google non riuscita', en: 'Failed to sign up with Google' }),
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
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                {t({ it: 'Nome utente', en: 'Username' })}
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Newt"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]{3,30}"
                autoComplete="username"
                aria-invalid={username.length > 0 && !isUsernameValid}
                className="bg-background/50 border-border text-foreground placeholder:text-muted-foreground"
              />
              {username.length > 0 && !isUsernameValid && (
                <p className="text-xs text-destructive">
                  {t({
                    it: 'Usa solo lettere, numeri o underscore.',
                    en: 'Use only letters, numbers, or underscores.',
                  })}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="planeswalker@phyrexia.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-invalid={email.length > 0 && !isEmailValid}
                className="bg-background/50 border-border text-foreground placeholder:text-muted-foreground"
              />
              {email.length > 0 && !isEmailValid && (
                <p className="text-xs text-destructive">
                  {t({ it: 'Inserisci una mail valida.', en: 'Enter a valid email address.' })}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                {t({ it: 'Password', en: 'Password' })}
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                aria-invalid={password.length > 0 && !isPasswordValid}
                className="bg-background/50 border-border text-foreground placeholder:text-muted-foreground"
              />
              <PasswordRequirements password={password} />
            </div>
            <TurnstileWidget
              siteKey={turnstileSiteKey}
              onVerify={(token) => {
                setCaptchaAvailable(true);
                setCaptchaToken(token);
              }}
              onExpire={() => setCaptchaToken('')}
              onError={() => {
                setCaptchaAvailable(false);
                setCaptchaToken('');
              }}
              resetSignal={captchaResetSignal}
              unavailableLabel={t({
                it: 'Verifica anti-bot non disponibile. Riprova tra poco.',
                en: 'Bot check unavailable. Please try again shortly.',
              })}
            />
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white font-semibold"
              disabled={loading || !isUsernameValid || !isEmailValid || !isPasswordValid}
            >
              {loading ? 'Compleating...' : t({ it: 'Inizia la Compleation', en: 'Begin Compleation' })}
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

              <GoogleSignInButton
                disabled={loading}
                onClick={handleGoogleRegister}
                label={{ it: 'Registrati con Google', en: 'Sign up with Google' }}
              />
            </>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t({ it: 'Hai gia un account?', en: 'Already have an account?' })}{' '}
            <Link href={`/auth/login?redirect=${encodeURIComponent(redirectPath)}`} className="text-violet-400 hover:text-violet-300 font-medium">
              {t({ it: 'Accedi', en: 'Sign in' })}
            </Link>
          </div>

          <RegisterTermsNotice />
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
