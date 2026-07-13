export const LEAVE_ARENA_CONFIRM_PHRASE = 'confirm';

export function isLeaveArenaConfirmationValid(value: string) {
  return value.trim().toLowerCase() === LEAVE_ARENA_CONFIRM_PHRASE;
}