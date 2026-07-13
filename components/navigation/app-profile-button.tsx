'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/language-provider';
import { cn } from '@/lib/utils';

export function AppProfileButton() {
  const pathname = usePathname();
  const { copy: t } = useLanguage();
  const active = pathname === '/profile';

  return (
    <Link href="/profile">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'text-muted-foreground hover:text-foreground',
          active && 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/30',
        )}
        aria-label={t({ it: 'Profilo', en: 'Profile' })}
        aria-current={active ? 'page' : undefined}
      >
        <User className="h-5 w-5" />
      </Button>
    </Link>
  );
}