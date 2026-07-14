export function getSupabaseErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const supabaseError = error as { message?: string; details?: string; hint?: string; code?: string };
    return [supabaseError.message, supabaseError.details, supabaseError.hint, supabaseError.code && `Code: ${supabaseError.code}`]
      .filter(Boolean)
      .join(' - ') || fallback;
  }
  return fallback;
}