'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AccessLogsPanel } from '@/components/admin/access-logs-panel';
import { AdminShell } from '@/components/admin/admin-shell';
import { AppLoader } from '@/components/ui/app-loader';
import { useAuth } from '@/hooks/use-auth';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import { useLanguage } from '@/components/language-provider';

export default function AdminAccessLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const { adminMode, loading: adminLoading } = usePlatformAdmin();
  const router = useRouter();
  const { copy: t } = useLanguage();
  const loading = authLoading || adminLoading;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/auth/login?redirect=/admin/access-logs');
      return;
    }

    if (!adminMode) {
      router.replace('/dashboard');
    }
  }, [adminMode, loading, router, user]);

  if (loading || !user || !adminMode) {
    return <AppLoader label={t({ it: 'Caricamento...', en: 'Loading...' })} />;
  }

  return (
    <AdminShell
      title={t({ it: 'Log accessi', en: 'Access Logs' })}
      description={t({
        it: 'Monitora gli accessi alla piattaforma con username e timestamp.',
        en: 'Monitor platform visits with username and timestamp.',
      })}
    >
      <AccessLogsPanel embedded />
    </AdminShell>
  );
}