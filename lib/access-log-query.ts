import type { SupabaseClient } from '@supabase/supabase-js';
import { ACCESS_LOG_RETENTION_DAYS, type AccessLogSource } from '@/lib/access-log';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export interface AccessLogEntry {
  id: string;
  username: string;
  source: AccessLogSource;
  accessedAt: string;
}

export type AccessLogPeriod = '24h' | '7d' | '30d' | 'all' | 'custom';

export interface AccessLogQueryOptions {
  limit?: number;
  period?: AccessLogPeriod;
  from?: string | null;
  to?: string | null;
}

export interface AccessLogDateRange {
  from?: string;
  to?: string;
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeAccessLogLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

export function normalizeAccessLogPeriod(value: string | null): AccessLogPeriod {
  if (value === '24h' || value === '7d' || value === '30d' || value === 'all' || value === 'custom') {
    return value;
  }
  return '7d';
}

function parseDateBoundary(value: string, endOfDay: boolean) {
  if (!DATE_PATTERN.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay) {
    date.setUTCHours(23, 59, 59, 999);
  }

  return date.toISOString();
}

export function resolveAccessLogDateRange(options: AccessLogQueryOptions): AccessLogDateRange | null {
  const period = options.period ?? '7d';
  const now = Date.now();

  if (period === 'all') {
    return {};
  }

  if (period === 'custom') {
    const from = options.from ? parseDateBoundary(options.from, false) : undefined;
    const to = options.to ? parseDateBoundary(options.to, true) : undefined;

    if (!from || !to) return null;
    if (new Date(from).getTime() > new Date(to).getTime()) return null;

    return { from, to };
  }

  const offsets: Record<Exclude<AccessLogPeriod, 'all' | 'custom'>, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': ACCESS_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  };

  return {
    from: new Date(now - offsets[period]).toISOString(),
    to: new Date(now).toISOString(),
  };
}

function mapAccessLogSource(value: string | null | undefined): AccessLogSource {
  return value === 'app' ? 'app' : 'web';
}

function mapAccessLogRows(
  rows: Array<{ id: string; username: string; source?: string | null; accessed_at: string }>,
): AccessLogEntry[] {
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    source: mapAccessLogSource(row.source),
    accessedAt: row.accessed_at,
  }));
}

async function fetchAccessLogsWithServiceRole(options: AccessLogQueryOptions): Promise<AccessLogEntry[]> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    throw new Error('Service role is not configured.');
  }

  const limit = options.limit ?? DEFAULT_LIMIT;
  const dateRange = resolveAccessLogDateRange(options);

  if (dateRange === null) {
    throw new Error('Invalid custom date range.');
  }

  let query = adminClient
    .from('access_logs')
    .select('id, accessed_at, source, user_id')
    .order('accessed_at', { ascending: false })
    .limit(limit);

  if (dateRange?.from) {
    query = query.gte('accessed_at', dateRange.from);
  }

  if (dateRange?.to) {
    query = query.lte('accessed_at', dateRange.to);
  }

  const { data: logs, error: logsError } = await query;

  if (logsError) {
    throw new Error(logsError.message);
  }

  const rows = logs ?? [];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));

  const profileByUserId = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, username')
      .in('id', userIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    for (const profile of profiles ?? []) {
      profileByUserId.set(profile.id, profile.username);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    username: profileByUserId.get(row.user_id) ?? 'unknown',
    source: mapAccessLogSource(row.source),
    accessedAt: row.accessed_at,
  }));
}

export async function fetchAccessLogsForAdmin(
  supabase: SupabaseClient,
  options: AccessLogQueryOptions = {},
): Promise<AccessLogEntry[]> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const dateRange = resolveAccessLogDateRange(options);

  if (dateRange === null) {
    throw new Error('Invalid custom date range.');
  }

  const { data, error } = await supabase.rpc('list_access_logs_for_admin', {
    p_limit: limit,
    p_from: dateRange.from ?? null,
    p_to: dateRange.to ?? null,
  });

  if (!error) {
    return mapAccessLogRows((data as Array<{ id: string; username: string; source?: string | null; accessed_at: string }> | null) ?? []);
  }

  const missingRpc = error.code === 'PGRST202'
    || error.message.includes('Could not find the function')
    || error.message.includes('list_access_logs_for_admin');

  if (!missingRpc) {
    throw new Error(error.message);
  }

  return fetchAccessLogsWithServiceRole(options);
}