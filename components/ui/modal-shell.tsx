'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function ModalOverlay({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80',
        'px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]',
        'sm:items-center sm:p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ModalCard({
  children,
  className,
  size = 'md',
}: {
  children: React.ReactNode;
  className?: string;
  size?: 'md' | 'lg' | 'xl';
}) {
  const maxWidth = size === 'xl' ? 'max-w-4xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-md';

  return (
    <Card
      className={cn(
        'flex w-full flex-col border-border bg-card',
        maxWidth,
        'max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)]',
        className,
      )}
    >
      {children}
    </Card>
  );
}