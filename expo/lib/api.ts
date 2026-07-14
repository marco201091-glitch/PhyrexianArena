import { getApiBaseUrl } from '@/lib/env';
import { supabase } from '@/lib/supabase';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<{ data?: T; error?: string; status: number }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiBaseUrl()}${path}`, { headers });
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