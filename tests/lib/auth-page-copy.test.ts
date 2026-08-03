import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('authentication page copy', () => {
  it('uses complete English CTA copy without placeholder wording', () => {
    const webLogin = read('app/auth/login/page.tsx');
    const webRegister = read('app/auth/register/page.tsx');
    const expoLogin = read('expo/app/(auth)/login.tsx');
    const translations = read('expo/lib/i18n/translations.ts');

    expect(webLogin).toContain("it: 'Entra', en: 'Enter'");
    expect(webRegister).toContain("it: 'Crea account', en: 'Create account'");
    expect(webRegister).toContain("it: 'Creazione account...', en: 'Creating account...'");
    expect(webRegister).not.toMatch(/Compleat/i);
    expect(expoLogin).toContain("copy('login')");
    expect(translations).toContain("login: 'Enter'");
    expect(translations).toContain("login: 'Entra'");
  });
});
