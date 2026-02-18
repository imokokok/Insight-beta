'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

import { BarChart3, Layers, User, Sparkles, TrendingUp, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
      const activeTrigger = tabsListRef.current.querySelector('[data-state="active"]') as HTMLElement;
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
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border md:hidden">
        <div className="container mx-auto px-4 py-3">
          <GlobalSearch />
        </div>
      </div>

      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="hidden md:flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t('explore.title')}
            </h1>
            <p className="mt-1 text-sm md:text-base text-muted-foreground">
              {t('explore.description')}
            </p>
          </div>
          <div className="w-full md:w-auto md:min-w-[300px]">
            <GlobalSearch />
          </div>
        </div>

        <div className="hidden md:block">
          <QuickAccess />
        </div>

        <div className="md:hidden">
          <details className="group">
            <summary className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer list-none">
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
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/90 shadow-md border border-border"
                aria-label="向左滚动"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            <div
              ref={tabsListRef}
              className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide"
              onScroll={checkScrollButtons}
            >
              <TabsList className="h-auto p-1 bg-muted inline-flex min-w-max md:min-w-0 md:w-full md:justify-start gap-1">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-2 px-3 md:px-4 py-2.5 h-auto text-sm md:text-base min-h-[44px] rounded-md"
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
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/90 shadow-md border border-border"
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
                <SlidersHorizontal className="h-4 w-4 mr-2" />
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
