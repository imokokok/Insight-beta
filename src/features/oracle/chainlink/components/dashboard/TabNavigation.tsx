'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

import { cn } from '@/shared/utils';

import type { TabItem } from './useTabNavigation';

export interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

const MIN_SWIPE_DISTANCE = 50;

export function TabNavigation({ tabs, activeTab, onTabChange, className }: TabNavigationProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);

  const goToNextTab = useCallback(() => {
    const nextIndex = (currentIndex + 1) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (nextTab) onTabChange(nextTab.id);
  }, [currentIndex, tabs, onTabChange]);

  const goToPrevTab = useCallback(() => {
    const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    const prevTab = tabs[prevIndex];
    if (prevTab) onTabChange(prevTab.id);
  }, [currentIndex, tabs, onTabChange]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    if (e.targetTouches[0]) {
      setTouchStart(e.targetTouches[0].clientX);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.targetTouches[0]) {
      setTouchEnd(e.targetTouches[0].clientX);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
    const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;

    if (isLeftSwipe) goToNextTab();
    if (isRightSwipe) goToPrevTab();
  };

  useEffect(() => {
    if (activeTabRef.current && tabsRef.current) {
      const container = tabsRef.current;
      const activeButton = activeTabRef.current;

      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      const isOutsideLeft = buttonRect.left < containerRect.left;
      const isOutsideRight = buttonRect.right > containerRect.right;

      if (isOutsideLeft) {
        container.scrollLeft -= containerRect.left - buttonRect.left + 20;
      } else if (isOutsideRight) {
        container.scrollLeft += buttonRect.right - containerRect.right + 20;
      }
    }
  }, [activeTab]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const tab = tabs[index];
      if (tab) onTabChange(tab.id);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const nextIndex = (index + 1) % tabs.length;
      const nextTab = tabs[nextIndex];
      if (nextTab) {
        const el = document.getElementById(`tab-${nextTab.id}`);
        el?.focus();
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      const prevTab = tabs[prevIndex];
      if (prevTab) {
        const el = document.getElementById(`tab-${prevTab.id}`);
        el?.focus();
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      const firstTab = tabs[0];
      if (firstTab) {
        const el = document.getElementById(`tab-${firstTab.id}`);
        el?.focus();
      }
    } else if (event.key === 'End') {
      event.preventDefault();
      const lastTab = tabs[tabs.length - 1];
      if (lastTab) {
        const el = document.getElementById(`tab-${lastTab.id}`);
        el?.focus();
      }
    }
  };

  return (
    <>
      <div
        className={cn(
          'relative border-b border-border/20 bg-[#0A0F1C]',
          'hidden md:block',
          className,
        )}
      >
        <div
          ref={tabsRef}
          role="tablist"
          aria-label="Tab navigation"
          className={cn(
            'scrollbar-hide flex h-10 items-center gap-1 overflow-x-auto px-4',
            'md:gap-2 md:px-6',
          )}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const showBadge = tab.badge !== undefined;

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                ref={isActive ? activeTabRef : null}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={cn(
                  'group relative flex h-10 shrink-0 items-center gap-2 px-4',
                  'text-sm font-medium transition-colors duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.icon && (
                  <span
                    className={cn(
                      'transition-colors duration-200',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground group-hover:text-foreground',
                    )}
                  >
                    {tab.icon}
                  </span>
                )}

                <span className="whitespace-nowrap">{tab.label}</span>

                {showBadge && (
                  <span
                    className={cn(
                      'ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5',
                      'text-[10px] font-semibold transition-colors duration-200',
                      typeof tab.badge === 'number' && tab.badge > 0
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted/30 text-muted-foreground',
                    )}
                  >
                    {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}

                <span
                  className={cn(
                    'absolute bottom-0 left-0 right-0 h-0.5 bg-primary',
                    'transition-transform duration-300 ease-out',
                    isActive ? 'scale-x-100' : 'scale-x-0',
                  )}
                  style={{ transformOrigin: 'left center' }}
                />
              </button>
            );
          })}
        </div>

        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-[#0A0F1C] to-transparent md:hidden" />
      </div>

      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'border-t border-border/30 bg-[#0A0F1C]/95 backdrop-blur-lg',
          'md:hidden',
          'safe-area-inset-bottom',
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          role="tablist"
          aria-label="Mobile tab navigation"
          className="flex h-14 items-center justify-around px-2"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 py-2',
                  'transition-colors duration-200',
                  'focus:outline-none',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {tab.icon && (
                  <span
                    className={cn('transition-transform duration-200', isActive && 'scale-110')}
                  >
                    {tab.icon}
                  </span>
                )}
                <span className="text-[10px] font-medium">{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'absolute right-1/2 top-1 translate-x-4',
                      'flex h-4 min-w-4 items-center justify-center rounded-full px-1',
                      'text-[9px] font-semibold',
                      typeof tab.badge === 'number' && tab.badge > 0
                        ? 'text-primary-foreground bg-primary'
                        : 'bg-muted/50 text-muted-foreground',
                    )}
                  >
                    {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default TabNavigation;
