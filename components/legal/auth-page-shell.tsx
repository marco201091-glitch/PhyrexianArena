'use client';

import { PublicLegalFooter } from '@/components/legal/public-legal-footer';

interface AuthPageShellProps {
  children: React.ReactNode;
}

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center p-4 pb-3">
        {children}
      </div>
      <PublicLegalFooter />
    </div>
  );
}