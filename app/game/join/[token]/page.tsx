import { GuestLiveGame } from '@/components/live-game/guest-live-game';

export const dynamic = 'force-dynamic';

export default async function GuestJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <GuestLiveGame inviteToken={token} />;
}
