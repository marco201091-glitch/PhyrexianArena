export type PasswordRecoveryCredentials = {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
};

const EMPTY_CREDENTIALS: PasswordRecoveryCredentials = {
  code: null,
  accessToken: null,
  refreshToken: null,
};

function completeTokenPair(params: URLSearchParams) {
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export function parsePasswordRecoveryUrl(url: string): PasswordRecoveryCredentials {
  if (!url.trim()) return EMPTY_CREDENTIALS;

  try {
    const parsedUrl = new URL(url);
    const queryTokens = completeTokenPair(parsedUrl.searchParams);
    if (queryTokens) {
      return { code: null, ...queryTokens };
    }

    const hash = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash;
    const hashTokens = completeTokenPair(new URLSearchParams(hash));
    if (hashTokens) {
      return { code: null, ...hashTokens };
    }

    return {
      code: parsedUrl.searchParams.get('code'),
      accessToken: null,
      refreshToken: null,
    };
  } catch {
    return EMPTY_CREDENTIALS;
  }
}
