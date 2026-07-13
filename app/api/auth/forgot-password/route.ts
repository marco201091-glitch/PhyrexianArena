import { NextResponse } from 'next/server';
import { isValidEmail, normalizeAppLocale } from '@/lib/auth-validation';
import { createPasswordRecoveryLink, findAuthUserByEmail } from '@/lib/auth-email-links';
import { buildPasswordResetEmail } from '@/lib/auth-email-templates';
import { getRequestRemoteIp, verifyHCaptcha } from '@/lib/hcaptcha-server';
import { sendAuthEmail } from '@/lib/resend-email';
import { getAuthSiteUrl } from '@/lib/auth-site-url';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { applyIpRateLimit } from '@/app/api/_lib/with-rate-limit';

export const runtime = 'nodejs';

interface ForgotPasswordRequestBody {
  email?: string;
  captchaToken?: string;
  locale?: string;
}

export async function POST(request: Request) {
  try {
    const rateLimited = await applyIpRateLimit(request, 'authForgotPassword');
    if (rateLimited) return rateLimited;

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: 'Password reset is not configured.' }, { status: 500 });
    }

    const body = await request.json() as ForgotPasswordRequestBody;
    const email = body.email?.trim().toLowerCase() || '';
    const captchaToken = body.captchaToken || '';
    const locale = normalizeAppLocale(body.locale);

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    if (!captchaToken) {
      return NextResponse.json({ error: 'Captcha verification is required.' }, { status: 400 });
    }

    const captchaValid = await verifyHCaptcha(captchaToken, getRequestRemoteIp(request));
    if (!captchaValid) {
      return NextResponse.json({ error: 'Captcha verification failed.' }, { status: 400 });
    }

    const user = await findAuthUserByEmail(adminClient, email);
    if (user?.email_confirmed_at) {
      const siteUrl = getAuthSiteUrl(request);
      const actionLink = await createPasswordRecoveryLink(adminClient, { email, siteUrl });
      const template = buildPasswordResetEmail(locale, actionLink);
      await sendAuthEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Forgot password API failed:', error);
    return NextResponse.json({ error: 'Password reset request failed.' }, { status: 500 });
  }
}