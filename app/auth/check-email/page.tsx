'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ManaLogo } from '@/components/ui/mana-logo';
import { useLanguage } from '@/components/language-provider';
import { Mail } from 'lucide-react';
import { AuthPageShell } from '@/components/legal/auth-page-shell';

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const { copy: t } = useLanguage();
  const email = searchParams.get('email') || '';
  const mode = searchParams.get('mode') === 'reset' ? 'reset' : 'signup';
  const resendHref = mode === 'reset'
    ? `/auth/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`
    : `/auth/resend-confirmation${email ? `?email=${encodeURIComponent(email)}` : ''}`;

  return (
    <AuthPageShell>
      <Card className="w-full max-w-xl border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="pb-5 text-center">
          <div className="flex justify-center">
            <ManaLogo size="xl" showText layout="stacked" subtitle="EDH Tracker" className="w-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/10 text-violet-300">
            <Mail className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">
              {mode === 'reset'
                ? t({ it: 'Controlla la tua email', en: 'Check your email' })
                : t({ it: 'Conferma la tua email', en: 'Confirm your email' })}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {mode === 'reset'
                ? t({
                    it: 'Se esiste un account con questa email, ti abbiamo inviato un link per reimpostare la password.',
                    en: 'If an account exists for this email, we sent you a password reset link.',
                  })
                : t({
                    it: 'Ti abbiamo inviato un link di conferma. Aprilo per attivare l\'account e poi accedi.',
                    en: 'We sent you a confirmation link. Open it to activate your account, then sign in.',
                  })}
            </p>
            {email ? (
              <p className="text-sm font-medium text-foreground">{email}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Button asChild variant="outline" className="w-full border-border text-foreground">
              <Link href={resendHref}>
                {mode === 'reset'
                  ? t({ it: 'Invia di nuovo il link', en: 'Send the link again' })
                  : t({ it: 'Reinvia conferma', en: 'Resend confirmation' })}
              </Link>
            </Button>
            <Button asChild className="w-full bg-gradient-to-r from-violet-600 to-purple-700">
              <Link href="/auth/login">{t({ it: 'Vai al login', en: 'Go to login' })}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <CheckEmailContent />
    </Suspense>
  );
}