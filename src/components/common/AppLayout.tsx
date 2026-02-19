'use client';

import React, { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { motion } from 'framer-motion';

import { Sidebar } from '@/components/common/EnhancedSidebar';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { MobileMenuButton, MobileSidebar, MobileNavProvider } from '@/components/common/MobileNav';
import { QuickSearch, useQuickSearch } from '@/components/common/QuickSearch';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { SyncStatus } from '@/features/oracle/components/SyncStatus';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

const routeTitleMap: Record<string, string> = {
  '/analytics': 'nav.monitoring',
  '/cross-chain': 'nav.crossChain',
  '/cross-chain/overview': 'nav.crossChainOverview',
  '/cross-chain/comparison': 'nav.crossChainComparison',
  '/cross-chain/history': 'nav.crossChainHistory',
  '/explore': 'nav.explore',
  '/alerts': 'nav.alertsCenter',
  '/oracle/analytics/disputes': 'nav.arbitration',
  '/oracle/analytics/deviation': 'nav.deviation',
  '/oracle/dashboard': 'nav.dashboard',
  '/oracle/protocols': 'nav.protocols',
  '/oracle/address': 'nav.address',
  '/oracle/comparison': 'nav.oracleComparison',
  '/oracle/reliability': 'nav.reliability',
};

function getPageTitle(pathname: string | null): string {
  if (!pathname) return 'app.brand';

  if (routeTitleMap[pathname]) {
    return routeTitleMap[pathname];
  }

  for (const [route, title] of Object.entries(routeTitleMap)) {
    if (pathname.startsWith(route + '/')) {
      return title;
    }
  }

  return 'app.brand';
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const { isOpen: isQuickSearchOpen, close: closeQuickSearch } = useQuickSearch();

  const titleKey = useMemo(() => getPageTitle(pathname), [pathname]);
  const title = t(titleKey);

  return (
    <FavoritesProvider>
      <MobileNavProvider>
        <QuickSearch isOpen={isQuickSearchOpen} onClose={closeQuickSearch} />
        <div className="flex min-h-screen">
          <div className="hidden w-[280px] flex-shrink-0 lg:block">
            <Sidebar />
          </div>

          <MobileSidebar>
            <Sidebar />
          </MobileSidebar>

          <main id="main-content" className="min-w-0 flex-1">
            <div className="container mx-auto max-w-7xl p-4 md:p-8">
              <header
                className={cn(
                  'sticky top-0 z-20 mb-6 flex items-center justify-between gap-3',
                  'border-b border-border/50 bg-background/80 backdrop-blur-sm',
                  'px-1 py-4',
                )}
              >
                <div className="flex items-center gap-3">
                  <MobileMenuButton />
                  <motion.h1
                    key={title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xl font-bold text-foreground md:text-2xl"
                  >
                    {title}
                  </motion.h1>
                </div>
                <div className="flex items-center gap-3">
                  <SyncStatus />
                  <LanguageSwitcher />
                </div>
              </header>
              {children}
            </div>
          </main>
        </div>
      </MobileNavProvider>
    </FavoritesProvider>
  );
}
