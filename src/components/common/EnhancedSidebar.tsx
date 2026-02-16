/**
 * Enhanced Sidebar Navigation
 *
 * 增强型侧边栏导航组件 - Web 版本
 * - 可折叠分组
 * - 多级菜单支持
 * - 搜索过滤
 */

'use client';

import React, { useState, useCallback, useMemo, createContext, useContext, useEffect } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Search,
  LayoutDashboard,
  Globe,
  X,
  Activity,
  AlertTriangle,
  ChevronLeft,
  Compass,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ConnectWallet } from '@/features/wallet/components/ConnectWallet';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import type { Route } from 'next';

// ============================================================================
// Types
// ============================================================================

export interface NavItem {
  id: string;
  label: string;
  labelEn?: string;
  href?: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  items?: NavItem[];
  disabled?: boolean;
  external?: boolean;
  description?: string;
  keywords?: string[];
  defaultExpanded?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  labelEn?: string;
  icon?: React.ElementType;
  items: NavItem[];
  defaultExpanded?: boolean;
  collapsible?: boolean;
}

export interface SidebarConfig {
  groups: NavGroup[];
  showSearch?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  expandedGroups: Set<string>;
  toggleGroup: (groupId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}

// ============================================================================
// Navigation Configuration
// ============================================================================

export const defaultNavConfig: SidebarConfig = {
  showSearch: true,
  collapsible: true,
  defaultCollapsed: false,
  groups: [
    {
      id: 'navigation',
      label: '',
      collapsible: false,
      items: [
        {
          id: 'dashboard',
          label: 'nav.dashboard',
          href: '/oracle/dashboard',
          icon: LayoutDashboard,
          description: 'nav.descriptions.dashboard',
        },
        {
          id: 'alerts',
          label: 'nav.alertsCenter',
          href: '/alerts',
          icon: AlertTriangle,
          description: 'nav.descriptions.alertsCenter',
        },
        {
          id: 'crossChain',
          label: 'nav.crossChain',
          href: '/cross-chain',
          icon: Globe,
          description: 'nav.descriptions.crossChain',
        },
        {
          id: 'explore',
          label: 'nav.explore',
          href: '/explore',
          icon: Compass,
          description: 'nav.descriptions.explore',
        },
        {
          id: 'analytics',
          label: 'nav.monitoring',
          href: '/analytics',
          icon: Activity,
          description: 'nav.descriptions.dashboard',
        },
        {
          id: 'assertions',
          label: 'nav.assertions',
          href: '/oracle/assertions',
          icon: AlertTriangle,
          description: 'nav.descriptions.assertions',
        },
      ],
    },
  ],
};

// ============================================================================
// Nav Item Component
// ============================================================================

interface NavItemProps {
  item: NavItem;
  level?: number;
  collapsed?: boolean;
}

function NavItemComponent({ item, level = 0, collapsed }: NavItemProps) {
  const pathname = usePathname();
  const { collapsed: sidebarCollapsed } = useSidebar();
  const prefersReducedMotion = useReducedMotion();
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(item.defaultExpanded ?? false);

  const isActive = useMemo(() => {
    if (!pathname || !item.href) return false;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }, [pathname, item.href]);

  const hasChildren = item.items && item.items.length > 0;
  const hasHref = item.href !== undefined && item.href !== null && item.href !== '';

  const handleClick = useCallback(() => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  }, [hasChildren, isExpanded]);

  const content = (
    <>
      <item.icon
        className={cn(
          'h-5 w-5 flex-shrink-0 transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
        )}
      />

      {!sidebarCollapsed && (
        <>
          <span
            className={cn(
              'ml-3 flex-1 truncate text-sm font-medium transition-colors',
              isActive ? 'text-primary-dark' : 'text-foreground group-hover:text-foreground',
            )}
          >
            {t(item.label)}
          </span>

          {item.badge !== undefined && item.badge !== 0 && (
            <Badge variant={item.badgeVariant || 'default'} className="ml-2 px-1.5 py-0 text-xs">
              {item.badge}
            </Badge>
          )}

          {hasChildren && (
            <ChevronRight
              className={cn(
                'ml-2 h-4 w-4 transition-transform duration-200',
                isExpanded && 'rotate-90',
              )}
            />
          )}
        </>
      )}
    </>
  );

  const baseClassName = cn(
    'flex items-center rounded-lg px-3 py-2 transition-all duration-200',
    'hover:bg-muted',
    isActive && 'bg-primary/5 hover:bg-primary/10',
    level > 0 && 'ml-4',
    item.disabled && 'cursor-not-allowed opacity-50',
  );

  if (collapsed) {
    if (!hasHref && hasChildren) {
      return null;
    }
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {hasHref ? (
            <Link
              href={item.href as Route}
              onClick={handleClick}
              data-tour={item.id}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-all',
                isActive
                  ? 'text-primary-dark bg-primary/10'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-5 w-5" />
            </Link>
          ) : (
            <button
              onClick={handleClick}
              data-tour={item.id}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-all',
                isActive
                  ? 'text-primary-dark bg-primary/10'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-5 w-5" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side="right">{t(item.label)}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="group">
      {hasHref ? (
        <Link
          href={item.href as Route}
          onClick={handleClick}
          data-tour={item.id}
          className={baseClassName}
        >
          {content}
        </Link>
      ) : (
        <button
          onClick={handleClick}
          data-tour={item.id}
          className={baseClassName}
        >
          {content}
        </button>
      )}

      {/* Submenu */}
      <AnimatePresence>
        {hasChildren && isExpanded && !sidebarCollapsed && (
          <motion.div
            initial={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1">
              {item.items!.map((child) => (
                <NavItemComponent key={child.id} item={child} level={level + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Nav Group Component
// ============================================================================

interface NavGroupProps {
  group: NavGroup;
}

function NavGroupComponent({ group }: NavGroupProps) {
  const { expandedGroups, toggleGroup, collapsed, searchQuery } = useSidebar();
  const prefersReducedMotion = useReducedMotion();
  const { t } = useI18n();
  const isExpanded = expandedGroups.has(group.id);
  const canCollapse = group.collapsible !== false;

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return group.items;
    const query = searchQuery.toLowerCase();
    return group.items.filter(
      (item) =>
        t(item.label).toLowerCase().includes(query) ||
        (item.description && t(item.description).toLowerCase().includes(query)) ||
        item.keywords?.some((k) => k.toLowerCase().includes(query)),
    );
  }, [group.items, searchQuery, t]);

  if (filteredItems.length === 0) return null;

  if (collapsed) {
    return (
      <div className="py-2">
        <div className="space-y-1">
          {filteredItems.map((item) => (
            <NavItemComponent key={item.id} item={item} collapsed />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      {group.label && canCollapse && (
        <button
          onClick={() => toggleGroup(group.id)}
          className="flex w-full items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          {group.icon && <group.icon className="mr-2 h-3.5 w-3.5" />}
          <span className="flex-1 text-left">{t(group.label)}</span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-200', !isExpanded && '-rotate-90')}
          />
        </button>
      )}

      {group.label && !canCollapse && (
        <div className="flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {group.icon && <group.icon className="mr-2 h-3.5 w-3.5" />}
          <span>{t(group.label)}</span>
        </div>
      )}

      <AnimatePresence>
        {(!canCollapse || isExpanded) && (
          <motion.div
            initial={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1 space-y-1"
          >
            {filteredItems.map((item) => (
              <NavItemComponent key={item.id} item={item} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Search Component
// ============================================================================

function SidebarSearch() {
  const { searchQuery, setSearchQuery } = useSidebar();
  const { t } = useI18n();

  return (
    <div className="px-3 py-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('nav.labels.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 border-border bg-muted pl-9 text-sm text-foreground focus:bg-card"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Sidebar Component
// ============================================================================

interface EnhancedSidebarProps {
  config?: SidebarConfig;
  className?: string;
}

export function EnhancedSidebar({ config = defaultNavConfig, className }: EnhancedSidebarProps) {
  const [collapsed, setCollapsed] = useState(config.defaultCollapsed ?? false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    config.groups.forEach((group) => {
      if (group.defaultExpanded !== false) {
        initial.add(group.id);
      }
    });
    return initial;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      collapsed,
      setCollapsed,
      expandedGroups,
      toggleGroup,
      searchQuery,
      setSearchQuery,
    }),
    [collapsed, expandedGroups, searchQuery, toggleGroup],
  );

  if (!isMounted) {
    return (
      <aside
        className={cn(
          'h-screen sticky top-0 border-r border-border bg-card',
          'flex flex-col',
          className,
        )}
        style={{ width: 280 }}
      />
    );
  }

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <aside
          className={cn(
            'h-screen sticky top-0 border-r border-border bg-card',
            'flex flex-col',
            className,
          )}
          style={{ width: collapsed ? 72 : 280 }}
          suppressHydrationWarning
        >
          {/* Header */}
          <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border px-4">
            {!collapsed && (
              <Link href="/" className="flex items-center gap-2">
                <img src="/logo-owl.png" alt="Logo" className="h-8 w-8" />
                <span className="text-lg font-bold text-foreground">Insight</span>
              </Link>
            )}
            {collapsed && (
              <div className="mx-auto">
                <img src="/logo-owl.png" alt="Logo" className="h-8 w-8" />
              </div>
            )}

            {config.collapsible && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                  'rounded-lg p-1.5 transition-colors hover:bg-muted',
                  collapsed && 'absolute -right-3 top-20 border border-border bg-card shadow-sm',
                )}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>

          {/* Search */}
          {config.showSearch && !collapsed && <SidebarSearch />}

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            {/* Navigation Groups */}
            <div className={cn('py-2', collapsed && 'px-1')}>
              {config.groups.map((group) => (
                <NavGroupComponent key={group.id} group={group} />
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-border p-3">
            <ConnectWallet />
          </div>
        </aside>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

// ============================================================================
// Export
// ============================================================================

export { EnhancedSidebar as Sidebar };
export default EnhancedSidebar;
