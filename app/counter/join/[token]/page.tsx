import { PublicCounterGuest } from '@/components/standalone/public-counter-guest';

export default async function PublicCounterJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicCounterGuest inviteToken={token} />;
}
