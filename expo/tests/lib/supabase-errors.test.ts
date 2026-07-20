import { describe, expect, it } from 'vitest';
import { getSupabaseErrorMessage } from '@/lib/supabase-errors';

describe('Supabase error messages', () => {
  it('extracts native and structured error details', () => {
    expect(getSupabaseErrorMessage(new Error('Network down'), 'Fallback')).toBe('Network down');
    expect(getSupabaseErrorMessage({ message: 'Denied', details: 'RLS', hint: 'Check policy', code: '42501' }, 'Fallback'))
      .toBe('Denied - RLS - Check policy - Code: 42501');
  });

  it('uses the fallback for empty or primitive errors', () => {
    expect(getSupabaseErrorMessage({}, 'Fallback')).toBe('Fallback');
    expect(getSupabaseErrorMessage('broken', 'Fallback')).toBe('Fallback');
  });
});
