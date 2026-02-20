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

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Globe,
  X,
  Activity,
  AlertTriangle,
  Compass,
  Gavel,
  Star,
  Shield,
  Server,
  GitBranch,
  Link2,
  Zap,
} from 'lucide-react';

import { FavoritesPanel } from '@/components/common/FavoritesPanel';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ConnectWallet } from '@/features/wallet/components/ConnectWallet';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n';
import { useFavoritesContext } from '@/shared/contexts/FavoritesContext';
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
  collapsible: false,
  defaultCollapsed: false,
  groups: [
    {
      id: 'oracleMonitoring',
      label: 'nav.groups.oracleMonitoring',
      collapsible: false,
      items: [
        {
          id: 'analytics',
          label: 'nav.dashboard',
          href: '/analytics',
          icon: Activity,
          description: 'nav.descriptions.dashboard',
        },
        {
          id: 'crossChain',
          label: 'nav.crossChain',
          href: '/cross-chain',
          icon: Globe,
          description: 'nav.descriptions.crossChain',
        },
        {
          id: 'reliability',
          label: 'nav.reliability',
          href: '/oracle/reliability',
          icon: Shield,
          description: 'nav.descriptions.reliability',
        },
        {
          id: 'explore',
          label: 'nav.explore',
          href: '/explore',
          icon: Compass,
          description: 'nav.descriptions.explore',
        },
      ],
    },
    {
      id: 'protocolAnalysis',
      label: 'nav.groups.protocolAnalysis',
      collapsible: false,
      items: [
        {
          id: 'chainlink',
          label: 'nav.chainlinkAnalysis',
          href: '/oracle/chainlink',
          icon: Link2,
          description: 'nav.descriptions.chainlinkAnalysis',
        },
        {
          id: 'pyth',
          label: 'nav.pythAnalysis',
          href: '/oracle/pyth',
          icon: Zap,
          description: 'nav.descriptions.pythAnalysis',
        },
        {
          id: 'api3',
          label: 'nav.api3Analysis',
          href: '/oracle/api3',
          icon: Server,
          description: 'nav.descriptions.api3Analysis',
        },
        {
          id: 'band',
          label: 'nav.bandAnalysis',
          href: '/oracle/band',
          icon: GitBranch,
          description: 'nav.descriptions.bandAnalysis',
        },
        {
          id: 'uma',
          label: 'nav.umaAnalysis',
          href: '/oracle/analytics/disputes',
          icon: Gavel,
          description: 'nav.descriptions.umaAnalysis',
        },
      ],
    },
    {
      id: 'tools',
      label: 'nav.groups.tools',
      collapsible: false,
      items: [
        {
          id: 'alerts',
          label: 'nav.alertsCenter',
          href: '/alerts',
          icon: AlertTriangle,
          description: 'nav.descriptions.alertsCenter',
        },
        {
          id: 'favorites',
          label: 'nav.favorites',
          icon: Star,
          description: 'nav.descriptions.favorites',
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
}

function NavItemComponent({ item, level = 0 }: NavItemProps) {
  const pathname = usePathname();
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

      <span
        className={cn(
          'ml-3 flex-1 truncate text-sm font-medium transition-colors',
          isActive ? 'font-semibold text-primary' : 'text-foreground group-hover:text-foreground',
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
  );

  const baseClassName = cn(
    'relative flex items-center rounded-lg px-3 py-2 transition-all duration-200',
    'hover:bg-muted',
    isActive && [
      'bg-primary/10 hover:bg-primary/15',
      'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
      'before:h-6 before:w-1 before:rounded-r before:bg-primary',
    ],
    level > 0 && 'ml-4',
    item.disabled && 'cursor-not-allowed opacity-50',
  );

  const navItem = hasHref ? (
    <Link
      href={item.href as Route}
      onClick={handleClick}
      data-tour={item.id}
      className={baseClassName}
    >
      {content}
    </Link>
  ) : (
    <button onClick={handleClick} data-tour={item.id} className={baseClassName}>
      {content}
    </button>
  );

  return (
    <div className="group">
      {item.description ? (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>{navItem}</TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="text-sm">{t(item.description)}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        navItem
      )}

      {/* Submenu */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
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
  const { expandedGroups, toggleGroup, searchQuery } = useSidebar();
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
  const { t } = useI18n();
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
      collapsed: false,
      setCollapsed: () => {},
      expandedGroups,
      toggleGroup,
      searchQuery,
      setSearchQuery,
    }),
    [expandedGroups, searchQuery, toggleGroup],
  );

  if (!isMounted) {
    return (
      <aside
        className={cn(
          'sticky top-0 h-screen border-r border-border bg-card',
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
            'sticky top-0 h-screen border-r border-border bg-card',
            'flex flex-col',
            className,
          )}
          style={{ width: 280 }}
          suppressHydrationWarning
        >
          {/* Header */}
          <div className="flex h-16 flex-shrink-0 items-center border-b border-border px-4">
            <Link
              href="/"
              className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-all duration-200 hover:bg-muted/50"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="relative h-8 w-8 overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-0.5"
              >
                <Image
                  src="/logo-owl.png"
                  alt={t('app.logoAlt')}
                  width={28}
                  height={28}
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:rotate-3"
                  priority
                />
              </motion.div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {t('app.brand')}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {t('app.subtitle')}
                </span>
              </div>
            </Link>
          </div>

          {/* Search */}
          {config.showSearch && <SidebarSearch />}

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            {/* Navigation Groups */}
            <div className="py-2">
              {config.groups.map((group) => (
                <NavGroupComponent key={group.id} group={group} />
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-border">
            <FavoritesSection />
            <div className="p-3">
              <ConnectWallet />
            </div>
          </div>
        </aside>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

function FavoritesSection() {
  const { t } = useI18n();
  const { favorites } = useFavoritesContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4" />
          <span>{t('favorites.title')}</span>
          {favorites.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {favorites.length}
            </Badge>
          )}
        </div>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform duration-200', isExpanded && 'rotate-180')}
        />
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="max-h-[200px] border-t border-border/50">
              <FavoritesPanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export { EnhancedSidebar as Sidebar };
export default EnhancedSidebar;
