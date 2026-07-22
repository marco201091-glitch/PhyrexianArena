import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthCookieOptions } from '@/lib/auth-persistence';
import { getSafeRedirectPath } from '@/lib/safe-redirect';
import { ensureOAuthUserProfile } from '@/lib/oauth-profile';
import { CANONICAL_SITE_ORIGIN } from '@/lib/canonical-host';
import {
  buildOAuthOriginBounceUrl,
  getSafeOAuthReturnOrigin,
  isVercelTeamDeploymentOrigin,
  readOAuthReturnOrigin,
} from '@/lib/oauth-return-origin';

function getAuthOrigin(request: NextRequest, requestUrl: URL) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  const forwardedOrigin = forwardedHost
    ? getSafeOAuthReturnOrigin(`${forwardedProto}://${forwardedHost}`)
    : null;

  if (forwardedOrigin) {
    return forwardedOrigin;
  }

  const requestOrigin = getSafeOAuthReturnOrigin(requestUrl.origin);
  return requestOrigin && !isVercelTeamDeploymentOrigin(requestOrigin)
    ? requestOrigin
    : CANONICAL_SITE_ORIGIN;
}

function redirectToLogin(request: NextRequest, requestUrl: URL, message: string) {
  const loginUrl = new URL('/auth/login', getAuthOrigin(request, requestUrl));
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
    return redirectToLogin(request, requestUrl, authError);
  }

  const code = requestUrl.searchParams.get('code');
  if (!code) {
    return redirectToLogin(
      request,
      requestUrl,
      'Invalid OAuth callback. Try signing in with Google again.',
    );
  }

  const authOrigin = getAuthOrigin(request, requestUrl);
  const nextPath = getSafeRedirectPath(requestUrl.searchParams.get('next'), '/');
  const redirectUrl = new URL(nextPath, authOrigin).toString();
  let response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getAuthCookieOptions(),
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
    return redirectToLogin(request, requestUrl, exchangeError.message);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirectToLogin(request, requestUrl, 'Invalid session. Try signing in again.');
  }

  try {
    await ensureOAuthUserProfile(supabase, user);
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : 'Unable to complete sign-in.';
    return redirectToLogin(request, requestUrl, message);
  }

  return response;
}
