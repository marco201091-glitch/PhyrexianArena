import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthCookieOptions } from '@/lib/auth-persistence';
import { getSafeRedirectPath } from '@/lib/safe-redirect';
import { ensureOAuthUserProfile } from '@/lib/oauth-profile';
import { CANONICAL_SITE_ORIGIN } from '@/lib/canonical-host';
import {
  buildOAuthOriginBounceUrl,
  isVercelTeamDeploymentOrigin,
  readOAuthReturnOrigin,
} from '@/lib/oauth-return-origin';

function getAuthOrigin(requestUrl: URL) {
  return isVercelTeamDeploymentOrigin(requestUrl.origin)
    ? CANONICAL_SITE_ORIGIN
    : requestUrl.origin;
}

function redirectToLogin(requestUrl: URL, message: string) {
  const loginUrl = new URL('/auth/login', getAuthOrigin(requestUrl));
  loginUrl.searchParams.set('error', message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const returnOrigin = readOAuthReturnOrigin(requestUrl.searchParams);
  const bounceUrl = buildOAuthOriginBounceUrl(requestUrl, returnOrigin);

  if (bounceUrl) {
    return NextResponse.redirect(bounceUrl);
  }

  const authError = requestUrl.searchParams.get('error_description')
    || requestUrl.searchParams.get('error');
  if (authError) {
    return redirectToLogin(requestUrl, authError);
  }

  const code = requestUrl.searchParams.get('code');
  if (!code) {
    return redirectToLogin(
      requestUrl,
      'Invalid OAuth callback. Try signing in with Google again.',
    );
  }

  const authOrigin = getAuthOrigin(requestUrl);
  const nextPath = getSafeRedirectPath(requestUrl.searchParams.get('next'), '/');
  const redirectUrl = new URL(nextPath, authOrigin).toString();
  let response = NextResponse.redirect(redirectUrl);

  const requestCookies = request.cookies.getAll();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getAuthCookieOptions(requestCookies),
      auth: {
        detectSessionInUrl: false,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.redirect(redirectUrl);

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return redirectToLogin(requestUrl, exchangeError.message);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirectToLogin(requestUrl, 'Invalid session. Try signing in again.');
  }

  try {
    await ensureOAuthUserProfile(supabase, user);
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : 'Unable to complete sign-in.';
    return redirectToLogin(requestUrl, message);
  }

  return response;
}