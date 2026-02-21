'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

import {
  BarChart3,
  Layers,
  User,
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import {
  MarketOverview,
  TrendingFeeds,
  DataDiscovery,
  GlobalSearch,
  QuickAccess,
} from '@/features/explore/components';
import { MobileFilterSheet } from '@/features/explore/components/MobileFilterSheet';
import type { TrendingSortBy } from '@/features/explore/types';
import { ProtocolExplorer, AddressExplorer } from '@/features/oracle/components';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useI18n } from '@/i18n';

export default function ExplorePage() {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('market-overview');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<TrendingSortBy>('volume');
  const tabsListRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  const tabs = [
    {
      value: 'market-overview',
      label: t('explore.tabs.marketOverview'),
      icon: BarChart3,
    },
    {
      value: 'trending',
      label: t('explore.tabs.trending'),
      icon: TrendingUp,
    },
    {
      value: 'protocols',
      label: t('explore.tabs.protocols'),
      icon: Layers,
    },
    {
      value: 'address',
      label: t('explore.tabs.address'),
      icon: User,
    },
    {
      value: 'discovery',
      label: t('explore.tabs.discovery'),
      icon: Sparkles,
    },
  ];

  const checkScrollButtons = useCallback(() => {
    if (tabsListRef.current && isMobile) {
      const { scrollWidth, clientWidth } = tabsListRef.current;
      setShowScrollButtons(scrollWidth > clientWidth);
    } else {
      setShowScrollButtons(false);
    }
  }, [isMobile]);

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [checkScrollButtons]);

  const scrollTabs = useCallback((direction: 'left' | 'right') => {
    if (tabsListRef.current) {
      const scrollAmount = 150;
      tabsListRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  }, []);

  const scrollToActiveTab = useCallback(() => {
    if (tabsListRef.current && isMobile) {
      const activeTrigger = tabsListRef.current.querySelector(
        '[data-state="active"]',
      ) as HTMLElement;
      if (activeTrigger) {
        activeTrigger.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [isMobile]);

  useEffect(() => {
    scrollToActiveTab();
  }, [activeTab, scrollToActiveTab]);

  const sortOptions = [
    { value: 'volume', label: '交易量' },
    { value: 'volatility', label: '波动性' },
    { value: 'updateFrequency', label: '更新频率' },
    { value: 'popularity', label: '关注度' },
  ];

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="px-4 py-3">
          <GlobalSearch />
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        <div className="hidden items-center justify-end md:flex">
          <div className="w-full md:w-auto md:min-w-[300px]">
            <GlobalSearch />
          </div>
        </div>

        <div className="hidden md:block">
          <QuickAccess />
        </div>

        <div className="md:hidden">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-sm font-medium">快捷入口</span>
              <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            </summary>
            <div className="mt-2">
              <QuickAccess maxItems={3} />
            </div>
          </details>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <div className="relative">
            {showScrollButtons && isMobile && (
              <button
                onClick={() => scrollTabs('left')}
                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-background/90 p-1.5 shadow-md"
                aria-label="向左滚动"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            <div
              ref={tabsListRef}
              className="scrollbar-hide -mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0"
              onScroll={checkScrollButtons}
            >
              <TabsList className="inline-flex h-auto min-w-max gap-1 bg-muted p-1 md:w-full md:min-w-0 md:justify-start">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex h-auto min-h-[44px] items-center gap-2 rounded-md px-3 py-2.5 text-sm md:px-4 md:text-base"
                  >
                    <tab.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {showScrollButtons && isMobile && (
              <button
                onClick={() => scrollTabs('right')}
                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-background/90 p-1.5 shadow-md"
                aria-label="向右滚动"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {activeTab === 'trending' && isMobile && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterOpen(true)}
                className="min-h-[44px] px-4"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                筛选
              </Button>
            </div>
          )}

          <TabsContent value="market-overview" className="mt-0">
            <MarketOverview />
          </TabsContent>

          <TabsContent value="trending" className="mt-0">
            <TrendingFeeds initialSortBy={sortBy} />
          </TabsContent>

          <TabsContent value="protocols" className="mt-0">
            <ProtocolExplorer />
          </TabsContent>

          <TabsContent value="address" className="mt-0">
            <AddressExplorer />
          </TabsContent>

          <TabsContent value="discovery" className="mt-0">
            <DataDiscovery />
          </TabsContent>
        </Tabs>
      </div>

      <MobileFilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="筛选热门交易对"
        sortValue={sortBy}
        onSortChange={setSortBy}
        sortOptions={sortOptions}
        onApply={() => {}}
        onReset={() => {
          setSortBy('volume');
        }}
      />
    </div>
  );
}
