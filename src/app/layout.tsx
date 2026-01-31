import './globals.css';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import { Toaster } from 'sonner';
import { WalletProvider } from '@/contexts/WalletContext';
import { cookies, headers } from 'next/headers';
import type { Metadata } from 'next';
import {
  detectLangFromAcceptLanguage,
  isLang,
  langToHtmlLang,
  LANG_STORAGE_KEY,
  translations,
} from '@/i18n/translations';
import { lazy, Suspense } from 'react';

const Sidebar = lazy(() =>
  import('@/components/features/common/Sidebar').then((mod) => ({
    default: mod.Sidebar,
  })),
);
const LanguageSwitcher = lazy(() =>
  import('@/components/features/common/LanguageSwitcher').then((mod) => ({
    default: mod.LanguageSwitcher,
  })),
);
const SyncStatus = lazy(() =>
  import('@/components/features/oracle/SyncStatus').then((mod) => ({
    default: mod.SyncStatus,
  })),
);
const ClientComponentsWrapper = lazy(() =>
  import('@/components/features/common/ClientComponentsWrapper').then((mod) => ({
    default: mod.ClientComponentsWrapper,
  })),
);
const WebVitalsMonitor = lazy(() =>
  import('@/components/features/common/WebVitalsMonitor').then((mod) => ({
    default: mod.WebVitalsMonitor,
  })),
);

function LoadingPlaceholder({ className }: { className?: string }) {
  return <div className={className} aria-hidden="true" />;
}

export const dynamic = 'force-dynamic';

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
    manifest: '/manifest.json',
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
  const c = await cookies();
  const cookieLang = c.get(LANG_STORAGE_KEY)?.value;
  const h = await headers();
  const lang = isLang(cookieLang)
    ? cookieLang
    : detectLangFromAcceptLanguage(h.get('accept-language'));
  return (
    <html lang={langToHtmlLang[lang]}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo-owl.png" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OracleMonitor" />
      </head>
      <body
        className={cn('min-h-screen bg-[var(--background)] font-sans text-purple-950 antialiased')}
      >
        <Suspense fallback={null}>
          <WebVitalsMonitor />
        </Suspense>
        <LanguageProvider initialLang={lang}>
          <WalletProvider>
            <Toaster />
            <div className="fixed inset-0 -z-30 bg-[#fafafa]" />
            <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-yellow-100/60 via-pink-100/60 to-cyan-100/60 opacity-80" />
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
              <div
                className="absolute left-[-10%] top-[-20%] h-[60%] w-[60%] animate-pulse rounded-full bg-gradient-to-br from-yellow-300/30 to-orange-300/30 mix-blend-multiply blur-[120px]"
                style={{ animationDuration: '8s' }}
              />
              <div
                className="absolute right-[-10%] top-[10%] h-[60%] w-[50%] animate-pulse rounded-full bg-gradient-to-br from-cyan-300/30 to-blue-300/30 mix-blend-multiply blur-[120px]"
                style={{ animationDuration: '10s' }}
              />
              <div
                className="absolute bottom-[-10%] left-[-10%] h-[60%] w-[50%] animate-pulse rounded-full bg-gradient-to-br from-pink-300/30 to-purple-300/30 mix-blend-multiply blur-[120px]"
                style={{ animationDuration: '12s' }}
              />
              <div
                className="absolute bottom-[-20%] right-[10%] h-[50%] w-[50%] animate-pulse rounded-full bg-gradient-to-br from-lime-300/30 to-emerald-300/30 mix-blend-multiply blur-[120px]"
                style={{ animationDuration: '9s' }}
              />
            </div>
            <div className="flex min-h-screen">
              <Suspense fallback={<LoadingPlaceholder className="hidden w-64 md:block" />}>
                <Sidebar />
              </Suspense>
              <main className="flex-1 transition-all duration-300 md:ml-64">
                <div className="container mx-auto max-w-7xl p-3 md:p-4 lg:p-8">
                  <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6">
                    <h2 className="text-xl font-bold text-purple-950 md:text-2xl">
                      {translations[lang].app.title}
                    </h2>
                    <div className="flex items-center gap-2 md:gap-3">
                      <Suspense
                        fallback={
                          <LoadingPlaceholder className="hidden h-6 w-24 animate-pulse rounded bg-gray-200 sm:flex" />
                        }
                      >
                        <SyncStatus className="hidden sm:flex" />
                      </Suspense>
                      <Suspense
                        fallback={
                          <LoadingPlaceholder className="h-8 w-8 animate-pulse rounded bg-gray-200" />
                        }
                      >
                        <LanguageSwitcher />
                      </Suspense>
                    </div>
                  </div>
                  <ClientComponentsWrapper>{children}</ClientComponentsWrapper>
                </div>
              </main>
            </div>
          </WalletProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
