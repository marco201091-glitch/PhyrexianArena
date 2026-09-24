'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Crown, Swords, Settings2, UserPlus, Users, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/components/language-provider';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { supabase } from '@/lib/supabase';
import { localizeNotification } from '@/lib/notification-copy';

type NotificationItem = {
  id: string;
  type: 'arena_invite' | 'arena_member_joined' | 'match_completed' | 'season_completed';
  title: string;
  body: string;
  data: { groupId?: string };
  read_at: string | null;
  created_at: string;
};

type NotificationPreferences = {
  arena_invite: boolean;
  arena_member_joined: boolean;
  match_completed: boolean;
  season_completed: boolean;
  push_enabled: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  arena_invite: true,
  arena_member_joined: true,
  match_completed: true,
  season_completed: true,
  push_enabled: true,
};

export function NotificationCenter() {
  const { user } = useAuth();
  const { copy, language } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const unread = useMemo(() => items.filter((item) => !item.read_at).length, [items]);
  const notificationStyle = (type: NotificationItem['type']) => ({
    arena_invite: { icon: UserPlus, className: 'border-violet-400/25 bg-violet-500/10 text-violet-200' },
    arena_member_joined: { icon: Users, className: 'border-sky-400/25 bg-sky-500/10 text-sky-200' },
    match_completed: { icon: Swords, className: 'border-amber-400/25 bg-amber-500/10 text-amber-100' },
    season_completed: { icon: Crown, className: 'border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100' },
  })[type];

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/notifications');
      if (!response.ok) return;
      const payload = await response.json() as {
        notifications?: NotificationItem[];
        preferences?: NotificationPreferences;
      };
      setItems(payload.notifications ?? []);
      setPreferences(payload.preferences ?? DEFAULT_PREFERENCES);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setOpen(false);
      return;
    }
    void load();
    const channel = supabase
      .channel(`notification-center:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'app_notifications', filter: `user_id=eq.${user.id}`,
      }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, user]);

  if (!user) return null;

  const patch = async (body: Record<string, unknown>) => {
    const response = await authenticatedFetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.ok) await load();
  };

  const openItem = async (item: NotificationItem) => {
    if (!item.read_at) await patch({ action: 'read', id: item.id });
    setOpen(false);
    if (item.data?.groupId) router.push(`/table/${item.data.groupId}`);
  };

  const togglePreference = async (key: keyof NotificationPreferences) => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    const response = await authenticatedFetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'preferences', preferences: { [key]: next[key] } }),
    });
    if (!response.ok) setPreferences(preferences);
  };

  return (
    <div className="fixed right-4 top-20 z-[70]">
      <button
        type="button"
        aria-label={copy({ it: 'Notifiche', en: 'Notifications' })}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-emerald-400/30 bg-black/85 text-emerald-200 shadow-xl backdrop-blur hover:bg-emerald-950"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-center text-xs font-bold text-white">
            {Math.min(unread, 99)}
          </span>
        )}
      </button>

      {open && (
        <section className="mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur" aria-label={copy({ it: 'Centro notifiche', en: 'Notification center' })}>
          <header className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-emerald-950/60 via-background to-cyan-950/30 p-3">
            <div className="flex-1"><strong>{copy({ it: 'Notifiche', en: 'Notifications' })}</strong><p className="text-xs text-muted-foreground">{unread ? copy({ it: `${unread} da leggere`, en: `${unread} unread` }) : copy({ it: 'Tutto aggiornato', en: 'All caught up' })}</p></div>
            <button type="button" onClick={() => void patch({ action: 'readAll' })} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label={copy({ it: 'Segna tutte come lette', en: 'Mark all as read' })}><CheckCheck className="h-4 w-4" /></button>
            <button type="button" onClick={() => setShowSettings((value) => !value)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label={copy({ it: 'Preferenze', en: 'Preferences' })}><Settings2 className="h-4 w-4" /></button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label={copy({ it: 'Chiudi', en: 'Close' })}><X className="h-4 w-4" /></button>
          </header>

          {showSettings && (
            <div className="space-y-2 border-b border-border p-3 text-sm">
              {([
                ['arena_invite', { it: 'Inviti al playgroup', en: 'Playgroup invitations' }],
                ['arena_member_joined', { it: 'Nuovi membri', en: 'New members' }],
                ['match_completed', { it: 'Partite concluse', en: 'Completed matches' }],
                ['season_completed', { it: 'Fine stagione', en: 'Season completed' }],
                ['push_enabled', { it: 'Notifiche push', en: 'Push notifications' }],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg p-2 hover:bg-muted/50">
                  <span>{copy(label)}</span>
                  <input type="checkbox" checked={preferences[key]} onChange={() => void togglePreference(key)} className="h-4 w-4 accent-emerald-500" />
                </label>
              ))}
            </div>
          )}

          <div className="max-h-[min(65vh,32rem)] overflow-y-auto">
            {loading && !items.length && <p className="p-5 text-center text-sm text-muted-foreground">{copy({ it: 'Caricamento…', en: 'Loading…' })}</p>}
            {!loading && !items.length && <p className="p-5 text-center text-sm text-muted-foreground">{copy({ it: 'Nessuna notifica', en: 'No notifications' })}</p>}
            {items.map((item) => {
              const localized = localizeNotification(item, language);
              const style = notificationStyle(item.type);
              const Icon = style.icon;
              return (
                <button key={item.id} type="button" onClick={() => void openItem(item)} className={`block w-full border-b border-border/60 p-3 text-left last:border-0 hover:bg-muted/40 ${item.read_at ? 'opacity-70' : 'bg-emerald-950/20'}`}>
                  <div className="flex gap-3"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${style.className}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{localized.title}</span><span className="mt-1 block text-sm text-muted-foreground">{localized.body}</span><time className="mt-2 block text-xs text-muted-foreground" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(language === 'it' ? 'it-IT' : 'en-US')}</time></span>{!item.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
