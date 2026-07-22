'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window { turnstile?: { render: (container: HTMLElement, options: Record<string, unknown>) => string; reset: (widgetId?: string) => void }; ReactNativeWebView?: { postMessage: (message: string) => void } }
}

export default function TurnstileMobilePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => window.turnstile?.render(containerRef.current!, {
      sitekey: siteKey, theme: 'dark', size: 'flexible',
      callback: (token: string) => window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'token', token })),
      'expired-callback': () => window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'expired' })),
      'error-callback': () => window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'error' })),
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, [siteKey]);

  return <main className="flex min-h-screen items-center justify-center bg-[#101018] p-4"><div ref={containerRef} className="w-full max-w-sm" /></main>;
}
