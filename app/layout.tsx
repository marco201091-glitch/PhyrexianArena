import './globals.css';
import type { Metadata } from 'next';
import { Inter, Cinzel } from 'next/font/google';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import { LanguageProvider } from '@/components/language-provider';
import { AppLocalizer } from '@/components/app-localizer';
import { AccessLogger } from '@/components/access-logger';
import { DemoBanner } from '@/components/demo-banner';
import { CapacitorNativeBridge } from '@/components/capacitor-native-bridge';

const inter = Inter({ subsets: ['latin'] });
const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-cinzel' });

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#0a0a0f',
};

export const metadata: Metadata = {
  title: 'Phyrexian Arena - EDH Tracker',
  description: 'Track your Commander games with the perfection of Phyrexia',
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
        <LanguageProvider>
          <AuthProvider>
            <AccessLogger />
            <CapacitorNativeBridge />
            <DemoBanner />
            {children}
            <AppLocalizer />
            <Toaster />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
