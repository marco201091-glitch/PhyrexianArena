import './globals.css';
import type { Metadata } from 'next';
import { Inter, Cinzel } from 'next/font/google';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import { LanguageProvider } from '@/components/language-provider';
import { AppLocalizer } from '@/components/app-localizer';
import { AccessLogger } from '@/components/access-logger';
import { DemoBanner } from '@/components/demo-banner';
import { QueryProvider } from '@/components/query-provider';
import { AppErrorBoundary } from '@/components/app-error-boundary';
import { AppNotificationListener } from '@/components/app-notification-listener';

const inter = Inter({ subsets: ['latin'] });
const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-cinzel' });

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#0a0a0f',
};

export const metadata: Metadata = {
  title: 'MTG Tracker & Analytics',
  description: 'Life counter, deck analytics, match history, and playgroup tools for Commander.',
  authors: [{ name: 'blackistoostrong' }],
  creator: 'blackistoostrong',
  publisher: 'blackistoostrong',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MTG Tracker',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} ${cinzel.variable}`} suppressHydrationWarning>
        <QueryProvider>
          <LanguageProvider>
            <AuthProvider>
            <AccessLogger />
            <AppNotificationListener />
            <DemoBanner />
            <AppErrorBoundary>{children}</AppErrorBoundary>
            <AppLocalizer />
            <Toaster />
            </AuthProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
