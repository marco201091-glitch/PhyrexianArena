'use client';

import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalCard, ModalOverlay } from '@/components/ui/modal-shell';
import { buildArenaJoinUrl } from '@/lib/arena-invite-qr';

export function ArenaInviteQrDialog({
  open,
  inviteCode,
  arenaName,
  onClose,
  labels,
}: {
  open: boolean;
  inviteCode: string;
  arenaName: string;
  onClose: () => void;
  labels: { title: string; hint: string; close: string };
}) {
  if (!open) return null;
  const joinUrl = buildArenaJoinUrl(window.location.origin, inviteCode);
  return <ModalOverlay>
    <ModalCard>
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div><h2 className="flex items-center gap-2 text-lg font-black"><QrCode className="h-5 w-5 text-cyan-300" />{labels.title}</h2><p className="mt-1 text-xs text-muted-foreground">{arenaName}</p></div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={labels.close}>×</Button>
      </div>
      <div className="space-y-4 p-5 text-center">
        {/* Generated only from the validated Arena invite code. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/invite-qr?code=${encodeURIComponent(inviteCode)}`} alt={`${labels.title}: ${arenaName}`} className="mx-auto aspect-square w-full max-w-72 rounded-2xl bg-white p-3" />
        <p className="text-sm text-muted-foreground">{labels.hint}</p>
        <p className="break-all rounded-xl bg-background/60 p-3 font-mono text-xs text-cyan-200">{joinUrl}</p>
        <Button onClick={onClose} className="w-full">{labels.close}</Button>
      </div>
    </ModalCard>
  </ModalOverlay>;
}
