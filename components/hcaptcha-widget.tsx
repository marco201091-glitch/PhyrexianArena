'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    hcaptcha?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: 'dark' | 'light';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

interface HCaptchaWidgetProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
  resetSignal?: number;
  className?: string;
  unavailableLabel: string;
}

let hcaptchaScriptPromise: Promise<void> | null = null;

function loadHCaptchaScript() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.hcaptcha) return Promise.resolve();
  if (hcaptchaScriptPromise) return hcaptchaScriptPromise;

  hcaptchaScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-hcaptcha-script="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('hCaptcha script failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.hcaptchaScript = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('hCaptcha script failed to load'));
    document.head.appendChild(script);
  });

  return hcaptchaScriptPromise;
}

export function HCaptchaWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
  resetSignal,
  className,
  unavailableLabel,
}: HCaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptError, setScriptError] = useState(false);

  useEffect(() => {
    if (!siteKey || !containerRef.current || widgetIdRef.current) return;

    let cancelled = false;

    loadHCaptchaScript()
      .then(() => {
        if (cancelled || !window.hcaptcha || !containerRef.current || widgetIdRef.current) return;
        widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'dark',
          callback: onVerify,
          'expired-callback': onExpire,
          'error-callback': () => {
            onExpire();
            onError();
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setScriptError(true);
          onError();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onError, onExpire, onVerify, siteKey]);

  useEffect(() => {
    if (resetSignal === undefined || !window.hcaptcha || !widgetIdRef.current) return;
    window.hcaptcha.reset(widgetIdRef.current);
  }, [resetSignal]);

  if (!siteKey || scriptError) {
    return (
      <div className={cn('flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive', className)}>
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{unavailableLabel}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex justify-center overflow-hidden rounded-md', className)}>
      <div ref={containerRef} />
    </div>
  );
}
