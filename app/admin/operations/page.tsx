'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';
import { AppLoader } from '@/components/ui/app-loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import { useLanguage } from '@/components/language-provider';
import { RefreshCw } from 'lucide-react';

type Operations = {
  backend: { version: string; commit: string };
  database: { ok: boolean; latencyMs: number };
  expectedLatestMigration: string;
  runtimeConfiguration: { minimum_supported_version?: string; recommended_version?: string; feature_flags?: Record<string, boolean> } | null;
  clientAdoption30d: { appVersions: Record<string, number>; webVisits: number; queryLimited: boolean };
  notificationDeliveries24h: { counts: Record<string, number>; available: boolean };
  liveGameSync14d: { available: boolean; sessions: number; successfulSyncs: number; failedSyncs: number; failureRate: number; recoveredSessions: number; sessionsWithQueue: number; maxQueueDepth: number; versionConflicts: number; slowestSyncMs: number; queryLimited: boolean };
  backupLastSuccessAt: string | null;
};

export default function AdminOperationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { adminMode, loading: adminLoading } = usePlatformAdmin();
  const { copy: t } = useLanguage();
  const router = useRouter();
  const [data, setData] = useState<Operations | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loading = authLoading || adminLoading;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const response = await fetch('/api/admin/operations');
    if (response.ok) setData(await response.json());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) return router.replace('/auth/login?redirect=/admin/operations');
    if (!adminMode) return router.replace('/dashboard');
    void refresh();
  }, [adminMode, loading, refresh, router, user]);

  if (loading || !user || !adminMode) return <AppLoader label={t({ it: 'Caricamento...', en: 'Loading...' })} />;
  const cards = data ? [
    ['Backend', `v${data.backend.version} · ${data.backend.commit.slice(0, 8)}`],
    ['Database', data.database.ok ? `OK · ${data.database.latencyMs} ms` : 'Degraded'],
    [t({ it: 'Compatibilità client', en: 'Client compatibility' }), `${data.runtimeConfiguration?.minimum_supported_version ?? '—'} → ${data.runtimeConfiguration?.recommended_version ?? '—'}`],
    [t({ it: 'Ultimo backup', en: 'Latest backup' }), data.backupLastSuccessAt ?? t({ it: 'Non esposto al container', en: 'Not exposed to container' })],
  ] : [];

  return <AdminShell title={t({ it: 'Operazioni', en: 'Operations' })} description={t({ it: 'Stato applicazione, database, client e consegna notifiche.', en: 'Application, database, client, and notification-delivery status.' })}>
    <div className="mb-4 flex justify-end"><Button variant="outline" onClick={() => void refresh()} disabled={refreshing}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{t({ it: 'Aggiorna', en: 'Refresh' })}</Button></div>
    <div className="grid gap-4 md:grid-cols-2">{cards.map(([title, value]) => <Card key={title}><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="font-mono text-sm text-muted-foreground">{value}</CardContent></Card>)}</div>
    {data ? <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>{t({ it: 'Versioni app · 30 giorni', en: 'App versions · 30 days' })}</CardTitle></CardHeader><CardContent><pre className="overflow-auto text-xs">{JSON.stringify(data.clientAdoption30d, null, 2)}</pre></CardContent></Card>
      <Card><CardHeader><CardTitle>{t({ it: 'Notifiche · 24 ore', en: 'Notifications · 24 hours' })}</CardTitle></CardHeader><CardContent><pre className="overflow-auto text-xs">{JSON.stringify(data.notificationDeliveries24h, null, 2)}</pre></CardContent></Card>
      <Card><CardHeader><CardTitle>{t({ it: 'Qualità sync Live · 14 giorni', en: 'Live sync quality · 14 days' })}</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3 text-sm"><div><b>{data.liveGameSync14d.failureRate}%</b><p className="text-muted-foreground">{t({ it: 'errori sync', en: 'sync failures' })}</p></div><div><b>{data.liveGameSync14d.recoveredSessions}</b><p className="text-muted-foreground">{t({ it: 'sessioni recuperate', en: 'recovered sessions' })}</p></div><div><b>{data.liveGameSync14d.maxQueueDepth}</b><p className="text-muted-foreground">{t({ it: 'coda massima', en: 'max queue' })}</p></div><div><b>{data.liveGameSync14d.slowestSyncMs} ms</b><p className="text-muted-foreground">{t({ it: 'sync più lento', en: 'slowest sync' })}</p></div><div><b>{data.liveGameSync14d.versionConflicts}</b><p className="text-muted-foreground">{t({ it: 'conflitti versione', en: 'version conflicts' })}</p></div><div><b>{data.liveGameSync14d.sessions}</b><p className="text-muted-foreground">{t({ it: 'sessioni osservate', en: 'observed sessions' })}</p></div></CardContent></Card>
    </div> : <AppLoader label={t({ it: 'Caricamento...', en: 'Loading...' })} />}
  </AdminShell>;
}
