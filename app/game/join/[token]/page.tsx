import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function GuestJoinPage() {
  // Remote guest join is intentionally disabled while the feature is redesigned.
  notFound();
}
