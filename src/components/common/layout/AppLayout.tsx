'use client';

import React, { useMemo, useState } from 'react';

import { usePathname } from 'next/navigation';

import { motion } from 'framer-motion';
import { Search, Command, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';
import { SyncStatus } from '@/features/oracle/components/SyncStatus';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useI18n } from '@/i18n';
import { FavoritesProvider } from '@/shared/contexts/FavoritesContext';
import { cn } from '@/shared/utils';

import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';
import { EnhancedSidebar as Sidebar } from './EnhancedSidebar';
import { MobileMenuButton, MobileSidebar, MobileNavProvider } from './MobileNav';
import { ErrorBoundary } from '../feedback/ErrorBoundary';
import { KeyboardShortcutsHelp } from '../shared/KeyboardShortcutsHelp';
import { LanguageSwitcher } from '../shared/LanguageSwitcher';
import { QuickSearch, useQuickSearch } from '../shared/QuickSearch';

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

function generateBreadcrumbs(
  pathname: string | null,
  t: (key: string) => string,
): BreadcrumbItem[] {
  if (!pathname || pathname === '/') return [];

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const titleKey = routeTitleMap[currentPath];
    const isLast = index === segments.length - 1;

    if (titleKey) {
      breadcrumbs.push({
        label: t(titleKey),
        href: isLast ? undefined : currentPath,
      });
    }
  });

  return breadcrumbs;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const {
    isOpen: isQuickSearchOpen,
    close: closeQuickSearch,
    toggle: toggleQuickSearch,
    open: openQuickSearch,
  } = useQuickSearch();

  const titleKey = useMemo(() => getPageTitle(pathname), [pathname]);
  const title = t(titleKey);
  const breadcrumbItems = useMemo(() => generateBreadcrumbs(pathname, t), [pathname, t]);

  // 处理刷新
  const handleRefresh = useMemo(() => {
    return () => {
      setIsRefreshing(true);
      window.location.reload();
      setTimeout(() => setIsRefreshing(false), 1000);
    };
  }, []);

  // 键盘快捷键
  useKeyboardShortcuts({
    onSearch: openQuickSearch,
    onRefresh: handleRefresh,
    onClose: closeQuickSearch,
    onHelp: () => setIsHelpOpen(true),
    enabled: true,
  });

  return (
    <FavoritesProvider>
      <MobileNavProvider>
        <QuickSearch isOpen={isQuickSearchOpen} onClose={closeQuickSearch} />
        <KeyboardShortcutsHelp open={isHelpOpen} onOpenChange={setIsHelpOpen} />
        <div className="flex min-h-screen">
          <div className="hidden w-[280px] flex-shrink-0 lg:block">
            <Sidebar />
          </div>

          <MobileSidebar>
            <Sidebar />
          </MobileSidebar>

          <main id="main-content" className="min-w-0 flex-1">
            <ErrorBoundary>
              <div className="container mx-auto max-w-7xl p-4 sm:p-6">
                <header className={cn('sticky top-0 z-20 mb-6 flex flex-col gap-3', 'px-1 py-5')}>
                  <div className="flex items-center justify-between gap-3">
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="hidden items-center gap-2 text-muted-foreground hover:text-foreground md:flex"
                        title={t('common.refresh')}
                      >
                        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                        <span className="text-sm">{t('common.refresh')}</span>
                        <kbd className="hidden h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium sm:flex">
                          R
                        </kbd>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="text-muted-foreground md:hidden"
                        aria-label={t('common.refresh')}
                      >
                        <RefreshCw className={cn('h-5 w-5', isRefreshing && 'animate-spin')} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleQuickSearch}
                        className="hidden items-center gap-2 text-muted-foreground hover:text-foreground md:flex"
                      >
                        <Search className="h-4 w-4" />
                        <span className="text-sm">{t('common.search')}</span>
                        <kbd className="hidden h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium sm:flex">
                          <Command className="h-3 w-3" />K
                        </kbd>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleQuickSearch}
                        className="text-muted-foreground md:hidden"
                        aria-label={t('common.searchAriaLabel')}
                      >
                        <Search className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsHelpOpen(true)}
                        className="hidden items-center gap-2 text-muted-foreground hover:text-foreground md:flex"
                        title="快捷键帮助"
                      >
                        <kbd className="hidden h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium sm:flex">
                          ?
                        </kbd>
                      </Button>
                      <SyncStatus />
                      <LanguageSwitcher />
                    </div>
                  </div>
                  {breadcrumbItems.length > 0 && (
                    <div className="ml-10 md:ml-14">
                      <Breadcrumb items={breadcrumbItems} />
                    </div>
                  )}
                </header>
                {children}
              </div>
            </ErrorBoundary>
          </main>
        </div>
      </MobileNavProvider>
    </FavoritesProvider>
  );
}
