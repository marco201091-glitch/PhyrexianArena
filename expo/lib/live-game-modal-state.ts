export function getDiscardConfirmationVisibility() {
  return {
    showExitChoice: false,
    showEndGame: false,
    showDiscardConfirm: true,
  } as const;
}
