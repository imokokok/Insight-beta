'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ResponsiveSidebarProps {
  children: ReactNode;
  sidebar: ReactNode;
  className?: string;
  sidebarClassName?: string;
  contentClassName?: string;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
}

export function ResponsiveSidebar({
  children,
  sidebar,
  className,
  sidebarClassName,
  contentClassName,
  defaultCollapsed = false,
  collapsible = true,
}: ResponsiveSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileOpen && !target.closest('[data-sidebar]') && !target.closest('[data-sidebar-toggle]')) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileOpen]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  return (
    <div className={cn('flex min-h-screen', className)}>
      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        data-sidebar
        className={cn(
          'fixed left-0 top-0 z-50 h-full bg-background border-r transition-all duration-300',
          isMobile
            ? isMobileOpen
              ? 'translate-x-0 w-72'
              : '-translate-x-full w-72'
            : isCollapsed
              ? 'w-16'
              : 'w-64',
          sidebarClassName
        )}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="flex h-14 items-center justify-between border-b px-4">
            {!isCollapsed && <span className="font-semibold">Menu</span>}
            {collapsible && !isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8"
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto py-4">
            {sidebar}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 transition-all duration-300',
          !isMobile && (isCollapsed ? 'ml-16' : 'ml-64'),
          contentClassName
        )}
      >
        {/* Mobile Header */}
        {isMobile && (
          <div className="sticky top-0 z-30 flex h-14 items-center border-b bg-background px-4">
            <Button
              data-sidebar-toggle
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileOpen(true)}
              className="h-8 w-8"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

// Sidebar navigation item
interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  href?: string;
  isActive?: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
  badge?: number;
}

export function SidebarItem({
  icon,
  label,
  href,
  isActive,
  isCollapsed,
  onClick,
  badge,
}: SidebarItemProps) {
  const content = (
    <>
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
              {badge}
            </span>
          )}
        </>
      )}
    </>
  );

  const className = cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    isCollapsed && 'justify-center'
  );

  if (href) {
    return (
      <a href={href} className={className} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <button className={cn('w-full', className)} onClick={onClick}>
      {content}
    </button>
  );
}

// Sidebar section
interface SidebarSectionProps {
  title?: string;
  children: ReactNode;
  isCollapsed?: boolean;
}

export function SidebarSection({ title, children, isCollapsed }: SidebarSectionProps) {
  return (
    <div className="px-3 py-2">
      {title && !isCollapsed && (
        <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

// Bottom sheet for mobile
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-background shadow-xl transition-transform duration-300',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-12 rounded-full bg-muted" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold">{title}</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </>
  );
}
