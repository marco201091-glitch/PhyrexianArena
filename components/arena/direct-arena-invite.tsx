'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/language-provider';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

type SearchUser = { id: string; username: string; display_name: string | null };

export function DirectArenaInvite({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  const { copy } = useLanguage();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setUsers([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const response = await authenticatedFetch(`/api/arena-invitations?groupId=${encodeURIComponent(groupId)}&q=${encodeURIComponent(query.trim())}`);
      const payload = await response.json().catch(() => ({ users: [] }));
      setUsers(response.ok ? payload.users ?? [] : []);
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [groupId, query]);

  const invite = async (user: SearchUser) => {
    setInviting(user.id);
    const response = await authenticatedFetch('/api/arena-invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, userId: user.id }),
    });
    const payload = await response.json().catch(() => ({}));
    setInviting(null);
    if (!response.ok) {
      toast({ title: copy({ it: 'Invito non inviato', en: 'Invitation not sent' }), description: payload.error, variant: 'destructive' });
      return;
    }
    toast({ title: copy({ it: 'Invito inviato', en: 'Invitation sent' }), description: `@${user.username}` });
    setQuery('');
    setUsers([]);
  };

  return (
    <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4">
      <div className="mb-3"><b>{copy({ it: 'Invita un utente registrato', en: 'Invite a registered user' })}</b><p className="text-xs text-muted-foreground">{copy({ it: 'Riceverà una notifica push e potrà accettare dalla dashboard.', en: 'They will receive a push notification and can accept from the dashboard.' })}</p></div>
      <div className="relative">
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy({ it: 'Cerca username o nome…', en: 'Search username or name…' })} className="pl-9" />
        {loading ? <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>
      {users.length ? <div className="mt-2 space-y-1">{users.map((user) => <div key={user.id} className="flex items-center gap-3 rounded-xl bg-background/50 p-2.5"><div className="min-w-0 flex-1"><b className="block truncate">{user.display_name || user.username}</b><span className="text-xs text-muted-foreground">@{user.username}</span></div><Button size="sm" onClick={() => void invite(user)} disabled={inviting === user.id}>{inviting === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div>)}</div> : null}
    </div>
  );
}
