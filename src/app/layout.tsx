import './globals.css';
import type { ReactNode } from 'react';

import { cookies, headers } from 'next/headers';

import { Toaster } from 'sonner';


import { PageProgress } from '@/components/common/PageProgress';
import { PageTransition } from '@/components/common/PageTransitions';
import { ResourceHints } from '@/components/common/ResourceHints';
import { Sidebar } from '@/components/common/EnhancedSidebar';
import { ClientComponentsWrapper } from '@/components/common/ClientComponentsWrapper';
import { WalletProvider } from '@/features/wallet/contexts/WalletContext';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { SyncStatus } from '@/features/oracle/components/SyncStatus';
import {
  detectLangFromAcceptLanguage,
  isLang,
  langToHtmlLang,
  LANG_STORAGE_KEY,
  translations,
} from '@/i18n/translations';
import { cn } from '@/shared/utils';

import type { Metadata } from 'next';

export const dynamic = 'force-static';
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const c = await cookies();
  const cookieLang = c.get(LANG_STORAGE_KEY)?.value;
  const h = await headers();
  const lang = isLang(cookieLang)
    ? cookieLang
    : detectLangFromAcceptLanguage(h.get('accept-language'));
  return {
    title: {
      default: translations[lang].app.title,
      template: `%s | ${translations[lang].app.title}`,
    },
    description: translations[lang].app.description,
    icons: {
      icon: '/logo-owl.png',
      apple: '/logo-owl.png',
    },
    openGraph: {
      type: 'website',
      locale: langToHtmlLang[lang],
      url: 'https://oracle-monitor.foresight.build',
      title: translations[lang].app.title,
      description: translations[lang].app.description,
      siteName: 'OracleMonitor',
    },
    twitter: {
      card: 'summary_large_image',
      title: translations[lang].app.title,
      description: translations[lang].app.description,
    },
    metadataBase: new URL('https://oracle-monitor.foresight.build'),
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [c, h] = await Promise.all([cookies(), headers()]);
  const cookieLang = c.get(LANG_STORAGE_KEY)?.value;
  const lang = isLang(cookieLang)
    ? cookieLang
    : detectLangFromAcceptLanguage(h.get('accept-language'));
  return (
    <html lang={langToHtmlLang[lang]}>
      <head>
        <ResourceHints />
        <link rel="icon" href="/logo-owl.png" />
        <meta name="theme-color" content="#6366f1" />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans text-foreground antialiased',
        )}
      >

          <PageProgress />
          <LanguageProvider initialLang={lang}>
            <WalletProvider>
              <Toaster />
              <div className="mesh-gradient" />
              <div className="animated-blobs">
                <div className="blob-1" />
                <div className="blob-2" />
                <div className="blob-3" />
                <div className="blob-4" />
              </div>
              <div className="min-h-screen flex">
                <div className="w-[280px] flex-shrink-0">
                  <Sidebar />
                </div>
                <main
                  id="main-content"
                  className="flex-1"
                >
                  <div className="container mx-auto max-w-7xl p-8">
                    <div className="sticky top-0 z-20 mb-6 flex items-center justify-between gap-3">
                      <h2 className="text-2xl font-bold text-foreground">
                        {translations[lang].app.title}
                      </h2>
                      <div className="flex items-center gap-3">
                        <SyncStatus />
                        <LanguageSwitcher />
                      </div>
                    </div>
                    <PageTransition variant="fade">
                      <ClientComponentsWrapper>{children}</ClientComponentsWrapper>
                    </PageTransition>
                  </div>
                </main>
              </div>
            </WalletProvider>
          </LanguageProvider>
      </body>
    </html>
  );
}
