import { describe, expect, it } from 'vitest';
import {
  isPasswordPolicyValid,
  isStrongPassword,
  isValidEmail,
  isValidUsername,
} from '@/lib/auth-validation';

describe('auth validation', () => {
  it('normalizes surrounding whitespace while validating email addresses', () => {
    expect(isValidEmail('  Player@Example.COM ')).toBe(true);
    expect(isValidEmail('player@example')).toBe(false);
    expect(isValidEmail('player example.com')).toBe(false);
  });

  it('accepts only portable usernames between 3 and 30 characters', () => {
    expect(isValidUsername('  Player_01 ')).toBe(true);
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('player-name')).toBe(false);
    expect(isValidUsername('x'.repeat(31))).toBe(false);
  });

  it('requires length, uppercase, lowercase, and a digit in passwords', () => {
    expect(isStrongPassword('Valid123')).toBe(true);
    expect(isStrongPassword('valid123')).toBe(false);
    expect(isStrongPassword('VALID123')).toBe(false);
    expect(isStrongPassword('ValidPass')).toBe(false);
    expect(isStrongPassword('Val1')).toBe(false);
    expect(isPasswordPolicyValid('Valid123')).toBe(true);
  });
});
