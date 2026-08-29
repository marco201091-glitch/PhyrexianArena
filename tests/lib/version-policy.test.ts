import { describe, expect, it } from 'vitest';
import { compareAppVersions, getClientSupportState } from '@/lib/version-policy';

describe('client version policy', () => {
  it('compares normalized semantic app versions', () => {
    expect(compareAppVersions('v8.2.0', '8.1.9')).toBe(1);
    expect(compareAppVersions('8.1', '8.1.0')).toBe(0);
    expect(compareAppVersions('8.0.9', '8.1.0')).toBe(-1);
  });

  it('keeps 8.1 supported while recommending 8.2', () => {
    expect(getClientSupportState('8.1.0', '8.1.0', '8.2.0')).toBe('update_available');
    expect(getClientSupportState('8.2.0', '8.1.0', '8.2.0')).toBe('supported');
    expect(getClientSupportState('8.0.9', '8.1.0', '8.2.0')).toBe('unsupported');
  });
});
