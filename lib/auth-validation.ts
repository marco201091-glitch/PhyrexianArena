export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim().toLowerCase());
}

export function isValidUsername(value: string) {
  return USERNAME_PATTERN.test(value.trim());
}

export function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

export type AppLocale = 'it' | 'en';

export function normalizeAppLocale(value: string | null | undefined): AppLocale {
  return value === 'en' ? 'en' : 'it';
}