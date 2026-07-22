import { NextResponse } from 'next/server';
import { isValidEmail, isValidUsername, isStrongPassword } from '@/lib/auth-validation';
import { getRequestRemoteIp, verifyTurnstile } from '@/lib/turnstile-server';
import { registerUserWithoutEmailConfirmation } from '@/lib/register-user';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { isReservedUsername } from '@/lib/reserved-usernames';
import { applyIpRateLimit } from '@/app/api/_lib/with-rate-limit';
import { DEMO_ACCOUNT_USERNAME, isDemoEmail } from '@/lib/demo';

export const runtime = 'nodejs';

interface RegisterRequestBody {
  email?: string;
  password?: string;
  username?: string;
  captchaToken?: string;
  locale?: string;
}

export async function POST(request: Request) {
  try {
    const rateLimited = await applyIpRateLimit(request, 'authRegister');
    if (rateLimited) return rateLimited;

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: 'Registration is not configured.' }, { status: 500 });
    }

    const body = await request.json() as RegisterRequestBody;
    const email = body.email?.trim().toLowerCase() || '';
    const username = body.username?.trim() || '';
    const password = body.password || '';
    const captchaToken = body.captchaToken || '';

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    if (!isValidUsername(username)) {
      return NextResponse.json({ error: 'Invalid username.' }, { status: 400 });
    }

    if (isReservedUsername(username) || username.trim().toLowerCase() === DEMO_ACCOUNT_USERNAME) {
      return NextResponse.json({ error: 'This username is not available.' }, { status: 400 });
    }

    if (isDemoEmail(email)) {
      return NextResponse.json({ error: 'Registration is not available for this email.' }, { status: 400 });
    }

    const configuredAdminEmails = (process.env.PLATFORM_ADMIN_EMAILS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    if (configuredAdminEmails.includes(email)) {
      return NextResponse.json({ error: 'Registration is not available for this email.' }, { status: 400 });
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json({ error: 'Password is too weak.' }, { status: 400 });
    }

    if (!captchaToken) {
      return NextResponse.json({ error: 'Captcha verification is required.' }, { status: 400 });
    }

    const captchaValid = await verifyTurnstile(captchaToken, getRequestRemoteIp(request));
    if (!captchaValid) {
      return NextResponse.json({ error: 'Captcha verification failed.' }, { status: 400 });
    }

    await registerUserWithoutEmailConfirmation(adminClient, {
      email,
      password,
      username,
    });

    return NextResponse.json({ ok: true, requiresEmailConfirmation: false });
  } catch (error) {
    console.error('Registration API failed:', error);
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (message.includes('username is already taken')) {
      return NextResponse.json({ error: 'This username is not available.' }, { status: 400 });
    }

    if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
      return NextResponse.json({ error: 'Registration failed. Try a different email or username.' }, { status: 400 });
    }

    console.error('Registration API failed:', error);
    return NextResponse.json({ error: `Registration failed: ${message}` }, { status: 500 });
  }
}
