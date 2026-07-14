'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { APP_VERSION, getLegalContactEmail, LEGAL_SITE_NAME } from '@/lib/legal-site';

export function PublicLegalFooter() {
  const { copy: t } = useLanguage();
  const year = new Date().getFullYear();
  const contactEmail = getLegalContactEmail();

  return (
    <footer className="safe-bottom border-t border-border/40 bg-background/80 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
        <p className="order-2 sm:order-1">
          © {year} {LEGAL_SITE_NAME}
          <span className="text-border" aria-hidden="true"> · </span>
          <span className="text-muted-foreground/80">v{APP_VERSION}</span>
        </p>
        <nav className="order-1 flex items-center gap-3 sm:order-2" aria-label={t({ it: 'Documenti legali', en: 'Legal documents' })}>
          <Link href="/legal/privacy" className="font-medium text-violet-400/90 transition-colors hover:text-violet-300">
            {t({ it: 'Privacy', en: 'Privacy' })}
          </Link>
          <span className="text-border" aria-hidden="true">·</span>
          <Link href="/legal/terms" className="font-medium text-violet-400/90 transition-colors hover:text-violet-300">
            {t({ it: 'Termini', en: 'Terms' })}
          </Link>
          <span className="text-border" aria-hidden="true">·</span>
          <Link href="/legal/cookies" className="font-medium text-violet-400/90 transition-colors hover:text-violet-300">
            {t({ it: 'Cookie', en: 'Cookies' })}
          </Link>
          <span className="text-border" aria-hidden="true">·</span>
          <a
            href={`mailto:${contactEmail}`}
            className="font-medium text-violet-400/90 transition-colors hover:text-violet-300"
          >
            {t({ it: 'Contatti', en: 'Contact' })}
          </a>
        </nav>
      </div>
    </footer>
  );
}