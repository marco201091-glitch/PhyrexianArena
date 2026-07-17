import { describe, expect, it } from 'vitest';
import { buildPublicCounterRealtimeTopic } from '@/lib/guest-realtime-topic';

describe('public counter realtime topic', () => {
  it('accepts only unguessable 48-hex secrets', () => {
    expect(buildPublicCounterRealtimeTopic('a'.repeat(48))).toBe(`counter:${'a'.repeat(48)}`);
    expect(buildPublicCounterRealtimeTopic('short')).toBeNull();
    expect(buildPublicCounterRealtimeTopic('Z'.repeat(48))).toBeNull();
  });
});
