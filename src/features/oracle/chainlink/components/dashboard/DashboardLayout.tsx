import React from 'react';

import { cn } from '@/shared/utils';

interface DashboardLayoutProps {
  leftPanel?: React.ReactNode;
  mainContent?: React.ReactNode;
  rightPanel?: React.ReactNode;
  topBar?: React.ReactNode;
  className?: string;
}

export function DashboardLayout({
  leftPanel,
  mainContent,
  rightPanel,
  topBar,
  className,
}: DashboardLayoutProps) {
  return (
    <div className={cn('flex min-h-screen flex-col bg-[#0A0F1C]', className)}>
      {topBar && (
        <div className="sticky top-0 z-50 border-b border-border/20 bg-[#0A0F1C]/95 backdrop-blur-md">
          {topBar}
        </div>
      )}

      <div className="flex flex-1 flex-col lg:flex-row">
        {leftPanel && (
          <aside
            className={cn(
              'hidden w-64 shrink-0 border-r border-border/20 bg-[rgba(15,23,42,0.8)] lg:block xl:w-72',
              'transition-all duration-300 ease-in-out',
            )}
          >
            <div className="sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto p-4">
              {leftPanel}
            </div>
          </aside>
        )}

        <main
          className={cn('flex-1 overflow-y-auto overflow-x-hidden', 'px-4 py-6 md:px-6 lg:px-8')}
        >
          {mainContent}
        </main>

        {rightPanel && (
          <aside
            className={cn(
              'hidden w-80 shrink-0 border-l border-border/20 bg-[rgba(15,23,42,0.8)] xl:block',
              'transition-all duration-300 ease-in-out',
            )}
          >
            <div className="sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto p-4">
              {rightPanel}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

interface LayoutSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function LeftNavSection({ children, className, title }: LayoutSectionProps) {
  return (
    <div className={cn('mb-6', className)}>
      {title && (
        <h3 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

export function MainContentSection({ children, className }: LayoutSectionProps) {
  return (
    <div className={cn('mb-6 rounded bg-[rgba(15,23,42,0.8)] p-4', className)}>{children}</div>
  );
}

export function RightStatusSection({ children, className, title }: LayoutSectionProps) {
  return (
    <div className={cn('mb-4 rounded border border-border/10 bg-card/50 p-3', className)}>
      {title && <h4 className="mb-2 text-xs font-medium text-muted-foreground">{title}</h4>}
      {children}
    </div>
  );
}

export default DashboardLayout;
