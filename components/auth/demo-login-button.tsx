'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/language-provider';
import { clearSupabaseAuthStorage } from '@/lib/supabase-auth-recovery';
import { resetSupabaseClient, supabase } from '@/lib/supabase';
import { setRememberMePreference } from '@/lib/auth-persistence';

interface DemoLoginButtonProps {
  disabled?: boolean;
  redirectPath?: string;
  className?: string;
}

export function DemoLoginButton({
  disabled = false,
  redirectPath = '/dashboard',
  className,
}: DemoLoginButtonProps) {
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoModeEnabled, setDemoModeEnabled] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { copy: t } = useLanguage();

  useEffect(() => {
    let cancelled = false;

    fetch('/api/demo-mode')
      .then((response) => response.json())
      .then((payload: { enabled?: boolean }) => {
        if (!cancelled) {
          setDemoModeEnabled(payload.enabled === true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDemoModeEnabled(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const response = await fetch('/api/auth/demo-login', { method: 'POST' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Demo login failed');
      }

      setRememberMePreference(false);
      clearSupabaseAuthStorage();
      resetSupabaseClient();

      const { error } = await supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });

      if (error) {
        throw error;
      }

      router.refresh();
      router.push(redirectPath);
    } catch {
      toast({
        title: t({ it: 'Errore', en: 'Error' }),
        description: t({
          it: 'Accesso demo non disponibile al momento.',
          en: 'Demo login is unavailable right now.',
        }),
        variant: 'destructive',
      });
    } finally {
      setDemoLoading(false);
    }
  };

  if (!demoModeEnabled) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={className ?? 'mt-4 w-full border-amber-500/40 text-amber-100 hover:bg-amber-500/10'}
      onClick={() => void handleDemoLogin()}
      disabled={disabled || demoLoading}
    >
      {demoLoading
        ? t({ it: 'Accesso demo...', en: 'Signing into demo...' })
        : t({ it: 'Prova la demo', en: 'Try the demo' })}
    </Button>
  );
}