'use client';

import React, { useEffect, useRef, useState } from 'react';

import { cn } from '@/shared/utils';

export interface TabContentProps {
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}

interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  isActive: boolean;
  className?: string;
}

function TabPanel({ id, children, isActive, className }: TabPanelProps) {
  const [shouldRender, setShouldRender] = useState(isActive);
  const [isVisible, setIsVisible] = useState(isActive);
  const prevIsActive = useRef(isActive);

  useEffect(() => {
    if (isActive && !prevIsActive.current) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else if (!isActive && prevIsActive.current) {
      setIsVisible(false);
    }
    prevIsActive.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!isVisible && shouldRender && !isActive) {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isVisible, shouldRender, isActive]);

  if (!shouldRender) return null;

  return (
    <div
      id={`tabpanel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      hidden={!isActive}
      className={cn(
        'transition-opacity duration-300 ease-in-out',
        isVisible ? 'opacity-100' : 'opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabContent({ activeTab, children, className }: TabContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const childArray = React.Children.toArray(children);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {childArray.map((child) => {
        if (React.isValidElement(child)) {
          const props = child.props as Record<string, unknown>;
          if (props && 'tabId' in props) {
            const tabId = props.tabId as string;
            return (
              <TabPanel key={tabId} id={tabId} isActive={activeTab === tabId}>
                {child}
              </TabPanel>
            );
          }
        }
        return null;
      })}
    </div>
  );
}

export interface TabPanelWrapperProps {
  tabId: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanelWrapper({ children, className }: TabPanelWrapperProps) {
  return <div className={className}>{children}</div>;
}

export default TabContent;
