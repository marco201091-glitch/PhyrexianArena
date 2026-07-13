import { describe, expect, it } from 'vitest';
import { isLeaveArenaConfirmationValid } from '@/lib/leave-arena-confirm';

describe('leave-arena-confirm', () => {
  it('accepts confirm case-insensitively with surrounding whitespace', () => {
    expect(isLeaveArenaConfirmationValid('confirm')).toBe(true);
    expect(isLeaveArenaConfirmationValid('CONFIRM')).toBe(true);
    expect(isLeaveArenaConfirmationValid(' Confirm ')).toBe(true);
  });

  it('rejects other values', () => {
    expect(isLeaveArenaConfirmationValid('')).toBe(false);
    expect(isLeaveArenaConfirmationValid('confirmed')).toBe(false);
    expect(isLeaveArenaConfirmationValid('conferma')).toBe(false);
  });
});