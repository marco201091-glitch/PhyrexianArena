import { NextResponse } from 'next/server';
import { requireAuthOr401 } from '@/app/api/_lib/require-auth';
import { enforceUserRateLimit } from '@/lib/api-rate-limit';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireAuthOr401(request);
  if (auth.response) return auth.response;
  const limited = await enforceUserRateLimit(auth.user.id, 'avatarUpload');
  if (limited) return limited;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';
  const base64 = typeof body.base64 === 'string' ? body.base64 : '';
  if (!ALLOWED_TYPES.has(mimeType) || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
  }
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > MAX_BYTES) return NextResponse.json({ error: 'Image too large' }, { status: 413 });

  const { error: uploadError } = await admin.storage.from('avatars').upload(`${auth.user.id}/avatar`, bytes, {
    cacheControl: '31536000', contentType: mimeType, upsert: true,
  });
  if (uploadError) return NextResponse.json({ error: 'Avatar upload failed' }, { status: 500 });

  const avatarRevision = new Date().toISOString();
  const { error: profileError } = await admin.from('profiles').update({ avatar_revision: avatarRevision }).eq('id', auth.user.id);
  if (profileError) return NextResponse.json({ error: 'Avatar update failed' }, { status: 500 });
  return NextResponse.json({ avatarRevision });
}
