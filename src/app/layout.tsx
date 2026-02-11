import './globals.css';
import type { ReactNode } from 'react';
import { lazy, Suspense } from 'react';

import { cookies, headers } from 'next/headers';

import { Toaster } from 'sonner';

import { MobileBottomNav } from '@/components/common/MobileBottomNav';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { PageProgress } from '@/components/common/PageProgress';
import { PerformanceMonitor } from '@/components/common/PerformanceMonitor';
import { ResourceHints } from '@/components/common/ResourceHints';
import { ServiceWorkerRegister } from '@/components/common/ServiceWorkerRegister';
import { SmartPreloader } from '@/components/common/SmartPreloader';
import { PWAInstallPrompt } from '@/components/features/pwa';
import { MobileChainSwitcher } from '@/components/features/wallet/MobileChainSwitcher';
import { WalletProvider } from '@/contexts/WalletContext';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import { AccessibilityProvider, SkipLink } from '@/components/common/AccessibilityProvider';
import { PageTransition } from '@/components/common/PageTransitions';
import {
  detectLangFromAcceptLanguage,
  isLang,
  langToHtmlLang,
  LANG_STORAGE_KEY,
  translations,
} from '@/i18n/translations';
import { cn } from '@/lib/utils';
import { MobileLayout } from '@/components/layout/MobileLayout';

import type { Metadata } from 'next';

const Sidebar = lazy(() =>
  import('@/components/common/Sidebar').then((mod) => ({
    default: mod.Sidebar,
  })),
);
const LanguageSwitcher = lazy(() =>
  import('@/components/common/LanguageSwitcher').then((mod) => ({
    default: mod.LanguageSwitcher,
  })),
);
const SyncStatus = lazy(() =>
  import('@/components/features/oracle/SyncStatus').then((mod) => ({
    default: mod.SyncStatus,
  })),
);
const ClientComponentsWrapper = lazy(() =>
  import('@/components/common/ClientComponentsWrapper').then((mod) => ({
    default: mod.ClientComponentsWrapper,
  })),
);
const ResourcePreloader = lazy(() =>
  import('@/components/common/ResourcePreloader').then((mod) => ({
    default: mod.ResourcePreloader,
  })),
);

function LoadingPlaceholder({ className }: { className?: string }) {
  return <div className={className} aria-hidden="true" />;
}

// 使用 ISR 缓存布局，但允许在请求时重新验证
export const dynamic = 'force-static';
export const revalidate = 60; // 60秒重新验证

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
  // 并行获取 cookies 和 headers - 性能优化
  const [c, h] = await Promise.all([cookies(), headers()]);
  const cookieLang = c.get(LANG_STORAGE_KEY)?.value;
  const lang = isLang(cookieLang)
    ? cookieLang
    : detectLangFromAcceptLanguage(h.get('accept-language'));
  return (
    <html lang={langToHtmlLang[lang]}>
      <head>
        <ResourceHints />
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
        <AccessibilityProvider>
          <SkipLink />
          <PageProgress />
          <Suspense fallback={null}>
            <ResourcePreloader />
          </Suspense>
          <Suspense fallback={null}>
            <ServiceWorkerRegister />
          </Suspense>
          <Suspense fallback={null}>
            <SmartPreloader />
          </Suspense>
          <Suspense fallback={null}>
            <OfflineIndicator />
          </Suspense>
          <Suspense fallback={null}>
            <PerformanceMonitor />
          </Suspense>
          <LanguageProvider initialLang={lang}>
            <WalletProvider>
              <Toaster />
              <MobileLayout>
                {/* 背景层 */}
                <div className="mesh-gradient" />
                <div className="animated-blobs">
                  <div className="blob-1" />
                  <div className="blob-2" />
                  <div className="blob-3" />
                  <div className="blob-4" />
                </div>
                <div className="flex min-h-screen-dynamic">
                  <Suspense fallback={<LoadingPlaceholder className="hidden w-64 md:block" />}>
                    <Sidebar />
                  </Suspense>
                  <main id="main-content" className="flex-1 transition-all duration-300 md:ml-64">
                    <div className="container mx-auto max-w-7xl p-3 pb-24 md:p-4 md:pb-4 lg:p-8">
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
                          {/* 移动端链切换 */}
                          <Suspense fallback={null}>
                            <div className="md:hidden">
                              <MobileChainSwitcher />
                            </div>
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
                      <PageTransition variant="fade">
                        <ClientComponentsWrapper>{children}</ClientComponentsWrapper>
                      </PageTransition>
                    </div>
                  </main>
                </div>
                {/* 移动端底部导航 */}
                <Suspense fallback={null}>
                  <MobileBottomNav />
                </Suspense>
                {/* PWA 安装提示 */}
                <Suspense fallback={null}>
                  <PWAInstallPrompt />
                </Suspense>
              </MobileLayout>
            </WalletProvider>
          </LanguageProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
