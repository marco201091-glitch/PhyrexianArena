'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  siteKey?: string;
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
  resetSignal?: number;
  className?: string;
  unavailableLabel: string;
};

let scriptPromise: Promise<void> | null = null;

function loadScript() {
  if (typeof window === 'undefined' || window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile script failed to load'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function TurnstileWidget({ siteKey, onVerify, onExpire, onError, resetSignal, className, unavailableLabel }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!siteKey || !containerRef.current || widgetIdRef.current) return;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !window.turnstile || !containerRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey, theme: 'dark', size: 'flexible', appearance: 'always',
        callback: onVerify, 'expired-callback': onExpire,
        'error-callback': () => { onExpire(); onError(); },
      });
    }).catch(() => { if (!cancelled) { setUnavailable(true); onError(); } });
    return () => { cancelled = true; };
  }, [onError, onExpire, onVerify, siteKey]);

  useEffect(() => {
    if (resetSignal !== undefined && window.turnstile && widgetIdRef.current) window.turnstile.reset(widgetIdRef.current);
  }, [resetSignal]);

  if (!siteKey || unavailable) return <div className={cn('flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200', className)}><AlertCircle className="h-4 w-4 shrink-0" /><span>{unavailableLabel}</span></div>;
  return <div className={cn('flex justify-center overflow-hidden rounded-md', className)}><div ref={containerRef} className="w-full" /></div>;
}
