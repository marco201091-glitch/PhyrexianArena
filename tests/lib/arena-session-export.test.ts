import { describe, expect, it } from 'vitest';
import { buildArenaSessionExportText, buildParticipantBullets } from '@/lib/arena-session-export';

describe('arena-session-export', () => {
  it('builds participant bullets on separate lines', () => {
    expect(buildParticipantBullets([
      { displayName: 'C', commanderLabel: 'mazzo 2' },
      { displayName: 'Mike', commanderLabel: 'mazzo blabla' },
    ])).toBe('- C mazzo 2\n- Mike mazzo blabla');
  });

  it('builds export text with custom intro only and multiline matchups', () => {
    const text = buildArenaSessionExportText('Radio Brainstorm, oggi si gioca.', [
      {
        participants: [
          { displayName: 'C', commanderLabel: 'mazzo 2' },
          { displayName: 'D', commanderLabel: 'mazzo 5' },
          { displayName: 'Mike', commanderLabel: 'mazzo blabla' },
        ],
        notes: 'Game comment.\nCAPITALISTA',
      },
      {
        participants: [
          { displayName: 'Yo', commanderLabel: 'Prismari' },
        ],
        notes: null,
      },
    ]);

    expect(text).toContain('Radio Brainstorm, oggi si gioca.');
    expect(text).not.toContain('chissà');
    expect(text).toContain('- C mazzo 2\n- D mazzo 5\n- Mike mazzo blabla');
    expect(text).toContain('Game comment.\nCAPITALISTA');
    expect(text).toContain('- Yo Prismari');
    expect(text).not.toContain(' vs ');
    expect(text).not.toContain('Nessun commento');
    expect(text).not.toContain('Partecipanti');
  });
});