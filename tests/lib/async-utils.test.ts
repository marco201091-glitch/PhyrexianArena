import { describe, expect, it, vi } from 'vitest';
import { delay, runTasksWithConcurrency } from '@/lib/async-utils';
import { isStrongPassword, isValidEmail, isValidUsername, normalizeAppLocale } from '@/lib/auth-validation';
import { cn } from '@/lib/utils';

describe('small shared utilities', () => {
  it('preserves order while limiting concurrent work', async () => {
    let active = 0;
    let peak = 0;
    const result = await runTasksWithConcurrency([3, 1, 2], 2, async (value, index) => {
      active += 1;
      peak = Math.max(peak, active);
      await delay(value);
      active -= 1;
      return `${index}:${value}`;
    });
    expect(result).toEqual(['0:3', '1:1', '2:2']);
    expect(peak).toBeLessThanOrEqual(2);
    await expect(runTasksWithConcurrency([], 0, vi.fn())).resolves.toEqual([]);
  });

  it('validates auth input and normalizes locale', () => {
    expect(isValidEmail(' User@Example.test ')).toBe(true);
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidUsername('player_8')).toBe(true);
    expect(isValidUsername('x!')).toBe(false);
    expect(isStrongPassword('Strong123')).toBe(true);
    expect(isStrongPassword('weak')).toBe(false);
    expect(normalizeAppLocale('en')).toBe('en');
    expect(normalizeAppLocale('fr')).toBe('it');
  });

  it('merges Tailwind classes deterministically', () => {
    expect(cn('px-2', false && 'hidden', 'px-4')).toBe('px-4');
  });
});
