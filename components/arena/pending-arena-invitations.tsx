'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Mail, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { useLanguage } from '@/components/language-provider';

type Invitation = {
  id: string;
  group_id: string;
  groups: { name: string } | Array<{ name: string }> | null;
  profiles: { username: string; display_name: string | null } | Array<{ username: string; display_name: string | null }> | null;
};

function one<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function PendingArenaInvitations({ onAccepted }: { onAccepted?: (groupId: string) => void }) {
  const { copy } = useLanguage();
  const [items, setItems] = useState<Invitation[]>([]);
  const [responding, setResponding] = useState<string | null>(null);
  const load = useCallback(async () => {
    const response = await authenticatedFetch('/api/arena-invitations');
    const payload = await response.json().catch(() => ({ invitations: [] }));
    if (response.ok) setItems(payload.invitations ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const respond = async (item: Invitation, action: 'accept' | 'decline') => {
    setResponding(item.id);
    const response = await authenticatedFetch('/api/arena-invitations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId: item.id, action }),
    });
    setResponding(null);
    if (!response.ok) return;
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    if (action === 'accept') onAccepted?.(item.group_id);
  };

  if (!items.length) return null;
  return <div className="space-y-3">{items.map((item) => {
    const group = one(item.groups);
    const inviter = one(item.profiles);
    return <Card key={item.id} className="border-emerald-400/30 bg-emerald-500/10"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><Mail className="h-6 w-6 text-emerald-300" /><div className="min-w-0 flex-1"><b>{copy({ it: 'Invito al playgroup', en: 'Playgroup invitation' })}: {group?.name}</b><p className="text-xs text-muted-foreground">{copy({ it: 'Da', en: 'From' })} {inviter?.display_name || `@${inviter?.username}`}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void respond(item, 'decline')} disabled={responding === item.id}><X className="mr-1 h-4 w-4" />{copy({ it: 'Rifiuta', en: 'Decline' })}</Button><Button size="sm" onClick={() => void respond(item, 'accept')} disabled={responding === item.id}>{responding === item.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}{copy({ it: 'Accetta', en: 'Accept' })}</Button></div></CardContent></Card>;
  })}</div>;
}
