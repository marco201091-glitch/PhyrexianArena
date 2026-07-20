import { getApiBaseUrl } from '@/lib/env';
import { supabase } from '@/lib/supabase';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(
  path: string,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<{ data?: T; error?: string; status: number }> {
  const headers = await getAuthHeaders();
  const controller = options?.timeoutMs ? new AbortController() : null;
  const handleAbort = () => controller?.abort();
  options?.signal?.addEventListener('abort', handleAbort, { once: true });
  const timer = controller
    ? setTimeout(() => controller.abort(), options?.timeoutMs)
    : null;
  const signal = controller?.signal ?? options?.signal;

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      headers,
      ...(signal ? { signal } : {}),
    });
  } finally {
    if (timer) clearTimeout(timer);
    options?.signal?.removeEventListener('abort', handleAbort);
  }
  const payload = await response.json().catch(() => ({})) as T & { error?: string };

  return {
    data: payload,
    error: typeof payload?.error === 'string' ? payload.error : undefined,
    status: response.status,
  };
}

export async function apiPost<T>(path: string, body: unknown): Promise<{ data?: T; error?: string; status: number }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  return {
    data: payload,
    error: typeof payload?.error === 'string' ? payload.error : undefined,
    status: response.status,
  };
}

export async function apiPatch<T>(path: string, body: unknown): Promise<{ data?: T; error?: string; status: number }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  return {
    data: payload,
    error: typeof payload?.error === 'string' ? payload.error : undefined,
    status: response.status,
  };
}
