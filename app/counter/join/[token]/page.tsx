import { notFound } from 'next/navigation';

export default function PublicCounterJoinPage() {
  // Remote guest join is intentionally disabled while the feature is redesigned.
  notFound();
}
