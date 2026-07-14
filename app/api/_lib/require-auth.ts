import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/app/api/_lib/auth';

export async function requireAuthOr401(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
    };
  }

  return { user, response: null };
}