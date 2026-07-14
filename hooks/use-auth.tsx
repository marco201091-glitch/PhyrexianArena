'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { clearSupabaseAuthStorage, isInvalidRefreshTokenError } from '@/lib/supabase-auth-recovery';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let resolved = false;

    const finishLoading = () => {
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    };

    const recoverInvalidSession = () => {
      clearSupabaseAuthStorage();
      setUser(null);
      finishLoading();
      void supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      const returnPath = `${window.location.pathname}${window.location.search}`;
      const loginPath = returnPath && returnPath !== '/auth/login'
        ? `/auth/login?redirect=${encodeURIComponent(returnPath)}`
        : '/auth/login';
      router.replace(loginPath);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isInvalidRefreshTokenError(event.reason)) return;
      event.preventDefault();
      recoverInvalidSession();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        finishLoading();
      }

      if (event === 'SIGNED_OUT') {
        router.push('/auth/login');
      }
    });

    supabase.auth.getUser()
      .then(({ data: { user: currentUser }, error }) => {
        if (error && isInvalidRefreshTokenError(error)) {
          recoverInvalidSession();
          return;
        }

        if (!resolved) {
          setUser(currentUser ?? null);
          finishLoading();
        }
      })
      .catch((error) => {
        if (isInvalidRefreshTokenError(error)) {
          recoverInvalidSession();
          return;
        }

        console.error('Auth session error:', error);
        setUser(null);
        finishLoading();
      });

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      subscription.unsubscribe();
    };
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);