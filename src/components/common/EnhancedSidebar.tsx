/**
 * Enhanced Sidebar Navigation
 *
 * 增强型侧边栏导航组件
 * - 可折叠分组
 * - 多级菜单支持
 * - 搜索过滤
 * - 最近访问
 * - 收藏功能
 * - 响应式设计
 */

'use client';

import React, { useState, useCallback, useMemo, createContext, useContext } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Star,
  Clock,
  LayoutDashboard,
  Globe,
  Shield,
  ShieldAlert,
  Settings,
  History,
  Bookmark,
  X,
  Menu,
  Activity,
  BarChart3,
  Layers,
  Zap,
  AlertTriangle,
  FileText,
  Users,
  ChevronLeft,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/shared/utils';

import type { Route } from 'next';

// ============================================================================
// Types
// ============================================================================

export interface NavItem {
  id: string;
  label: string;
  labelEn?: string;
  href: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  children?: NavItem[];
  disabled?: boolean;
  external?: boolean;
  description?: string;
  keywords?: string[];
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
  showFavorites?: boolean;
  showRecents?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  expandedGroups: Set<string>;
  toggleGroup: (groupId: string) => void;
  favorites: Set<string>;
  toggleFavorite: (itemId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  recentItems: string[];
  addRecentItem: (itemId: string) => void;
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
  showFavorites: true,
  showRecents: true,
  collapsible: true,
  defaultCollapsed: false,
  groups: [
    {
      id: 'main',
      label: '主导航',
      labelEn: 'Main',
      collapsible: false,
      items: [
        {
          id: 'dashboard',
          label: '仪表板',
          labelEn: 'Dashboard',
          href: '/oracle/dashboard',
          icon: LayoutDashboard,
          description: '系统概览和关键指标',
        },
        {
          id: 'comparison',
          label: '统一预言机',
          labelEn: 'Unified Oracle',
          href: '/oracle/comparison',
          icon: Globe,
          description: '跨协议价格对比',
        },
      ],
    },
    {
      id: 'monitor',
      label: '监控',
      labelEn: 'Monitor',
      icon: Activity,
      defaultExpanded: true,
      items: [
        {
          id: 'security',
          label: '安全监控',
          labelEn: 'Security',
          href: '/security/dashboard',
          icon: Shield,
          description: '安全态势感知',
        },
        {
          id: 'alerts',
          label: '告警中心',
          labelEn: 'Alerts',
          href: '/alerts',
          icon: ShieldAlert,
          badge: 0,
          badgeVariant: 'destructive',
          description: '实时告警通知',
        },
        {
          id: 'monitoring',
          label: '性能监控',
          labelEn: 'Monitoring',
          href: '/oracle/monitoring',
          icon: Activity,
          description: '系统性能指标',
        },
      ],
    },
    {
      id: 'analytics',
      label: '分析',
      labelEn: 'Analytics',
      icon: BarChart3,
      items: [
        {
          id: 'trends',
          label: '趋势分析',
          labelEn: 'Trends',
          href: '/oracle/analytics',
          icon: BarChart3,
          description: '价格趋势和预测',
        },
        {
          id: 'anomalies',
          label: '异常检测',
          labelEn: 'Anomalies',
          href: '/oracle/analytics/anomalies',
          icon: AlertTriangle,
          description: 'ML 异常检测',
        },
        {
          id: 'deviation',
          label: '偏差分析',
          labelEn: 'Deviation',
          href: '/oracle/analytics/deviation',
          icon: Activity,
          description: '价格偏差分析',
        },
      ],
    },
    {
      id: 'operations',
      label: '运营',
      labelEn: 'Operations',
      icon: Layers,
      items: [
        {
          id: 'disputes',
          label: '争议处理',
          labelEn: 'Disputes',
          href: '/disputes',
          icon: FileText,
          description: '争议管理和处理',
        },
        {
          id: 'assertions',
          label: '断言管理',
          labelEn: 'Assertions',
          href: '/oracle/optimistic/assertions',
          icon: Zap,
          description: '乐观预言机断言',
        },
        {
          id: 'watchlist',
          label: '关注列表',
          labelEn: 'Watchlist',
          href: '/watchlist',
          icon: Bookmark,
          description: '关注的资产',
        },
      ],
    },
    {
      id: 'slo',
      label: 'SLO',
      labelEn: 'SLO',
      icon: BarChart3,
      items: [
        {
          id: 'slo-dashboard',
          label: 'SLO 仪表板',
          labelEn: 'SLO Dashboard',
          href: '/oracle/slo-v2',
          icon: BarChart3,
          description: '服务等级目标',
        },
        {
          id: 'timeline',
          label: '事件时间线',
          labelEn: 'Timeline',
          href: '/oracle/timeline',
          icon: History,
          description: '系统事件追踪',
        },
      ],
    },
    {
      id: 'protocols',
      label: '协议',
      labelEn: 'Protocols',
      icon: Layers,
      items: [
        {
          id: 'protocol-list',
          label: '协议列表',
          labelEn: 'Protocol List',
          href: '/oracle/protocols',
          icon: Layers,
          description: '所有协议概览',
        },
        {
          id: 'optimistic',
          label: '乐观预言机',
          labelEn: 'Optimistic Oracle',
          href: '/oracle/optimistic',
          icon: Zap,
          children: [
            {
              id: 'oo-dashboard',
              label: 'OO 仪表板',
              href: '/oracle/optimistic',
              icon: LayoutDashboard,
            },
            {
              id: 'governance',
              label: '治理',
              href: '/oracle/optimistic/governance',
              icon: Users,
            },
            {
              id: 'rewards',
              label: '奖励',
              href: '/oracle/optimistic/rewards',
              icon: Star,
            },
          ],
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
  const { favorites, toggleFavorite, addRecentItem, collapsed: sidebarCollapsed } = useSidebar();
  const prefersReducedMotion = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(false);

  const isActive = useMemo(() => {
    if (!pathname) return false;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }, [pathname, item.href]);

  const isFavorite = favorites.has(item.id);
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = useCallback(() => {
    addRecentItem(item.id);
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  }, [addRecentItem, item.id, hasChildren, isExpanded]);

  const content = (
    <>
      <item.icon
        className={cn(
          'h-5 w-5 flex-shrink-0 transition-colors',
          isActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-700',
        )}
      />

      {!sidebarCollapsed && (
        <>
          <span
            className={cn(
              'ml-3 flex-1 truncate text-sm font-medium transition-colors',
              isActive ? 'text-primary-dark' : 'text-gray-700 group-hover:text-gray-900',
            )}
          >
            {item.label}
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

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(item.id);
            }}
            className={cn(
              'ml-2 opacity-0 transition-opacity group-hover:opacity-100',
              isFavorite && 'opacity-100',
            )}
          >
            <Star
              className={cn(
                'h-4 w-4',
                isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400',
              )}
            />
          </button>
        </>
      )}
    </>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        {}
        <TooltipTrigger asChild>
          <Link
            href={item.href as Route}
            onClick={handleClick}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-all',
              isActive
                ? 'text-primary-dark bg-primary/10'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            <item.icon className="h-5 w-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="group">
      {}
      <Link
        href={item.href as Route}
        onClick={handleClick}
        className={cn(
          'flex items-center rounded-lg px-3 py-2 transition-all duration-200',
          'hover:bg-gray-50',
          isActive && 'bg-primary/5 hover:bg-primary/10',
          level > 0 && 'ml-4',
          item.disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        {content}
      </Link>

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
              {item.children!.map((child) => (
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
  const isExpanded = expandedGroups.has(group.id);
  const canCollapse = group.collapsible !== false;

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return group.items;
    const query = searchQuery.toLowerCase();
    return group.items.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.labelEn?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.keywords?.some((k) => k.toLowerCase().includes(query)),
    );
  }, [group.items, searchQuery]);

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
          className="flex w-full items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 transition-colors hover:text-gray-700"
        >
          {group.icon && <group.icon className="mr-2 h-3.5 w-3.5" />}
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-200', !isExpanded && '-rotate-90')}
          />
        </button>
      )}

      {group.label && !canCollapse && (
        <div className="flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          {group.icon && <group.icon className="mr-2 h-3.5 w-3.5" />}
          <span>{group.label}</span>
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

  return (
    <div className="px-3 py-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="搜索导航..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 border-gray-200 bg-gray-50 pl-9 text-sm focus:bg-white"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Favorites Component
// ============================================================================

function SidebarFavorites({ config }: { config: SidebarConfig }) {
  const { favorites, collapsed } = useSidebar();

  const favoriteItems = useMemo(() => {
    const items: NavItem[] = [];
    config.groups.forEach((group) => {
      group.items.forEach((item) => {
        if (favorites.has(item.id)) {
          items.push(item);
        }
        if (item.children) {
          item.children.forEach((child) => {
            if (favorites.has(child.id)) {
              items.push(child);
            }
          });
        }
      });
    });
    return items;
  }, [favorites, config.groups]);

  if (favoriteItems.length === 0) return null;

  return (
    <div className="border-b border-gray-100 py-2">
      {!collapsed && (
        <div className="flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <Star className="mr-2 h-3.5 w-3.5" />
          <span>收藏</span>
        </div>
      )}
      <div className={cn('space-y-1', collapsed && 'px-1')}>
        {favoriteItems.map((item) => (
          <NavItemComponent key={item.id} item={item} collapsed={collapsed} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Recents Component
// ============================================================================

function SidebarRecents({ config }: { config: SidebarConfig }) {
  const { recentItems, collapsed } = useSidebar();

  const recentNavItems = useMemo(() => {
    const itemMap = new Map<string, NavItem>();
    config.groups.forEach((group) => {
      group.items.forEach((item) => {
        itemMap.set(item.id, item);
        if (item.children) {
          item.children.forEach((child) => {
            itemMap.set(child.id, child);
          });
        }
      });
    });
    return recentItems
      .slice(0, 5)
      .map((id) => itemMap.get(id))
      .filter((item): item is NavItem => item !== undefined);
  }, [recentItems, config.groups]);

  if (recentNavItems.length === 0) return null;

  return (
    <div className="border-b border-gray-100 py-2">
      {!collapsed && (
        <div className="flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <Clock className="mr-2 h-3.5 w-3.5" />
          <span>最近访问</span>
        </div>
      )}
      <div className={cn('space-y-1', collapsed && 'px-1')}>
        {recentNavItems.map((item) => (
          <NavItemComponent key={item.id} item={item} collapsed={collapsed} />
        ))}
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    config.groups.forEach((group) => {
      if (group.defaultExpanded !== false) {
        initial.add(group.id);
      }
    });
    return initial;
  });
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [recentItems, setRecentItems] = useState<string[]>([]);
  const prefersReducedMotion = useReducedMotion();

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

  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const addRecentItem = useCallback((itemId: string) => {
    setRecentItems((prev) => {
      const filtered = prev.filter((id) => id !== itemId);
      return [itemId, ...filtered].slice(0, 10);
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      collapsed,
      setCollapsed,
      expandedGroups,
      toggleGroup,
      favorites,
      toggleFavorite,
      searchQuery,
      setSearchQuery,
      recentItems,
      addRecentItem,
    }),
    [
      collapsed,
      expandedGroups,
      favorites,
      searchQuery,
      recentItems,
      toggleGroup,
      toggleFavorite,
      addRecentItem,
    ],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        {/* Mobile Overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? {} : { opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed left-4 top-4 z-30 rounded-lg bg-white p-2 shadow-md md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Sidebar */}
        <motion.aside
          initial={prefersReducedMotion ? {} : { x: -300 }}
          animate={{
            x: mobileOpen ? 0 : undefined,
            width: collapsed ? 72 : 280,
          }}
          className={cn(
            'fixed bottom-0 left-0 top-0 z-50 border-r border-gray-200 bg-white',
            'flex flex-col shadow-xl md:shadow-none',
            'transition-all duration-300 ease-in-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            className,
          )}
          style={{ width: collapsed ? 72 : 280 }}
        >
          {/* Header */}
          <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-100 px-4">
            {!collapsed && (
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <LayoutDashboard className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">Insight</span>
              </Link>
            )}
            {collapsed && (
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
            )}

            {config.collapsible && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                  'rounded-lg p-1.5 transition-colors hover:bg-gray-100',
                  collapsed && 'absolute -right-3 top-20 border border-gray-200 bg-white shadow-sm',
                )}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronLeft className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}
          </div>

          {/* Search */}
          {config.showSearch && !collapsed && <SidebarSearch />}

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            {/* Favorites */}
            {config.showFavorites && <SidebarFavorites config={config} />}

            {/* Recents */}
            {config.showRecents && !searchQuery && <SidebarRecents config={config} />}

            {/* Navigation Groups */}
            <div className={cn('py-2', collapsed && 'px-1')}>
              {config.groups.map((group) => (
                <NavGroupComponent key={group.id} group={group} />
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-gray-100 p-3">
            {!collapsed ? (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">Admin User</p>
                  <p className="truncate text-xs text-gray-500">admin@example.com</p>
                </div>
                <Link href={'/settings' as Route}>
                  <Settings className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </Link>
              </div>
            ) : (
              <Tooltip>
                {}
                <TooltipTrigger asChild>
                  <Link
                    href={'/settings' as Route}
                    className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100"
                  >
                    <Settings className="h-5 w-5 text-gray-500" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">设置</TooltipContent>
              </Tooltip>
            )}
          </div>
        </motion.aside>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

// ============================================================================
// Export
// ============================================================================

export { EnhancedSidebar as Sidebar };
export default EnhancedSidebar;
