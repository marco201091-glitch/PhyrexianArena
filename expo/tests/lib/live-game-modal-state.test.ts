import { describe, expect, it } from 'vitest';
import { getDiscardConfirmationVisibility } from '@/lib/live-game-modal-state';

describe('live game terminal modal state', () => {
  it('closes every parent modal before opening discard confirmation', () => {
    expect(getDiscardConfirmationVisibility()).toEqual({
      showExitChoice: false,
      showEndGame: false,
      showDiscardConfirm: true,
    });
  });
});
