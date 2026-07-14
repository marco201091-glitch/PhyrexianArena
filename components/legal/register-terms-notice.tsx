'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';

export function RegisterTermsNotice() {
  const { copy: t } = useLanguage();

  return (
    <p className="mt-6 text-center text-xs text-muted-foreground">
      {t({
        it: 'Registrandoti accetti i ',
        en: 'By signing up you accept our ',
      })}
      <Link href="/legal/terms" className="font-medium text-violet-400 hover:text-violet-300">
        {t({ it: 'Termini d’uso', en: 'Terms of Use' })}
      </Link>
      {t({ it: ' e la ', en: ' and ' })}
      <Link href="/legal/privacy" className="font-medium text-violet-400 hover:text-violet-300">
        {t({ it: 'Informativa sulla privacy', en: 'Privacy Policy' })}
      </Link>
      {t({ it: ', l’', en: ', the ' })}
      <Link href="/legal/cookies" className="font-medium text-violet-400 hover:text-violet-300">
        {t({ it: 'Informativa sui cookie', en: 'Cookie Policy' })}
      </Link>
      .
    </p>
  );
}