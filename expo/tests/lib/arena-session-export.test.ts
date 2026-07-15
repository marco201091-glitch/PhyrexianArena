import { describe, expect, it } from 'vitest';
import { buildArenaSessionExportText, buildParticipantBullets } from '@/lib/arena-session-export';

describe('arena session export', () => {
  it('keeps one participant per line and trims an empty commander label', () => {
    expect(buildParticipantBullets([
      { displayName: 'C', commanderLabel: 'Atraxa' },
      { displayName: 'Mike', commanderLabel: '' },
    ])).toBe('- C Atraxa\n- Mike');
  });

  it('preserves multiline notes without adding empty placeholders', () => {
    const text = buildArenaSessionExportText('  Friday night  ', [
      { participants: [{ displayName: 'C', commanderLabel: 'Atraxa' }], notes: 'Line one\nLine two' },
      { participants: [{ displayName: 'M', commanderLabel: 'Krenko' }], notes: '   ' },
    ]);

    expect(text).toBe('Friday night\n\n- C Atraxa\n\nLine one\nLine two\n\n- M Krenko');
  });

  it('returns an empty export for an empty intro and no matches', () => {
    expect(buildArenaSessionExportText('  ', [])).toBe('');
  });
});
