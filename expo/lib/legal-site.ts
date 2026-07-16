import { getSupportEmail } from '@/lib/env';

export const LEGAL_SITE_NAME = 'Phyrexian Arena';
export const APP_VERSION = '4.0.1';
export const LEGAL_LAST_UPDATED = '2026-07-10';

export function getLegalContactEmail() {
  return getSupportEmail().trim().toLowerCase();
}

export function getLegalContactLabel(_language: 'it' | 'en') {
  return getLegalContactEmail();
}
