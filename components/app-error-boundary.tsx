'use client';

import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { Button } from '@/components/ui/button';

function Fallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">The screen could not be loaded. Try again.</p>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </main>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary FallbackComponent={Fallback} onReset={() => window.location.reload()}>{children}</ErrorBoundary>;
}
