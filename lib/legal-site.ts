export const LEGAL_SITE_NAME = 'Phyrexian Arena';
export const APP_VERSION = '4.4.0';
export const LEGAL_LAST_UPDATED = '2026-07-16';
export const OFFICIAL_SUPPORT_EMAIL = 'support@phyrexianarena.dpdns.org';

export function getLegalContactEmail() {
  const configured = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim().toLowerCase();
  return configured || OFFICIAL_SUPPORT_EMAIL;
}

export function getLegalContactLabel(_language: 'it' | 'en') {
  return getLegalContactEmail();
}
