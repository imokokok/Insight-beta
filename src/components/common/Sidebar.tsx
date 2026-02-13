'use client';

import { useState, useCallback, useMemo, memo } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  ShieldAlert,
  Menu,
  X,
  ScrollText,
  Star,
  Globe,
  LayoutDashboard,
  TrendingUp,
  Shield,
  ShieldCheck,
  Brain,
  Target,
  Clock,
  Link2,
} from 'lucide-react';

import { ConnectWallet } from '@/features/wallet/components/ConnectWallet';
import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/shared/utils';

import type { LucideIcon } from 'lucide-react';
import type { Route } from 'next';

// Type assertion helper for Link href
const asRoute = (href: string): Route => href as Route;

// 导航项类型定义
interface NavItemConfig {
  key: string;
  href: string;
  icon: LucideIcon;
  tooltip: string;
  tourId?: string;
  exact?: boolean;
}

// 导航分组类型定义
interface NavGroupConfig {
  id: string;
  labelKey: string;
  items: NavItemConfig[];
}

// 导航分组配置 - 统一配置所有导航项
const navGroups: NavGroupConfig[] = [
  {
    id: 'monitor',
    labelKey: 'nav.groups.monitor',
    items: [
      {
        key: 'nav.dashboard',
        href: '/oracle/dashboard',
        icon: LayoutDashboard,
        tooltip: 'nav.descriptions.dashboard',
        tourId: 'dashboard',
      },
      {
        key: 'nav.unifiedOracle',
        href: '/oracle/comparison',
        icon: Globe,
        tooltip: 'nav.descriptions.unifiedOracle',
      },
      {
        key: 'nav.security',
        href: '/security/dashboard',
        icon: Shield,
        tooltip: 'nav.descriptions.security',
      },
    ],
  },
  {
    id: 'handle',
    labelKey: 'nav.groups.handle',
    items: [
      {
        key: 'nav.alerts',
        href: '/alerts',
        icon: ShieldAlert,
        tooltip: 'nav.descriptions.alerts',
        tourId: 'alerts',
      },
      {
        key: 'nav.disputes',
        href: '/disputes',
        icon: ShieldAlert,
        tooltip: 'nav.descriptions.disputes',
      },
    ],
  },
  {
    id: 'operate',
    labelKey: 'nav.groups.operate',
    items: [
      {
        key: 'nav.audit',
        href: '/audit',
        icon: ScrollText,
        tooltip: 'nav.descriptions.audit',
      },
      {
        key: 'nav.watchlist',
        href: '/watchlist',
        icon: Star,
        tooltip: 'nav.descriptions.watchlist',
        tourId: 'watchlist',
      },
    ],
  },
  {
    id: 'slo',
    labelKey: 'nav.groups.sloGroup',
    items: [
      {
        key: 'nav.slo',
        href: '/oracle/slo-v2',
        icon: Target,
        tooltip: 'nav.descriptions.sloDashboard',
      },
      {
        key: 'nav.timeline',
        href: '/oracle/timeline',
        icon: Clock,
        tooltip: 'nav.descriptions.timeline',
      },
    ],
  },
  {
    id: 'protocols',
    labelKey: 'nav.groups.protocolsGroup',
    items: [
      {
        key: 'nav.priceFeeds',
        href: '/oracle/protocols',
        icon: TrendingUp,
        tooltip: 'nav.descriptions.priceFeeds',
      },
      {
        key: 'nav.optimisticOracle',
        href: '/oracle/optimistic',
        icon: ShieldCheck,
        tooltip: 'nav.descriptions.optimistic',
      },
      {
        key: 'nav.crossChain',
        href: '/cross-chain',
        icon: Link2,
        tooltip: 'nav.descriptions.crossChain',
      },
      {
        key: 'nav.aiAnalytics',
        href: '/oracle/analytics',
        icon: Brain,
        tooltip: 'nav.descriptions.aiAnalytics',
      },
    ],
  },
];

// 单个导航项组件 - 提取减少重复代码
interface NavItemProps {
  item: NavItemConfig;
  isActive: boolean;
  onNavigate?: () => void;
}

const NavItem = memo(function NavItem({ item, isActive, onNavigate }: NavItemProps) {
  const { t } = useI18n();
  const Icon = item.icon;

  const linkProps = useMemo(() => {
    const props: Record<string, string> = {};
    if (item.tourId) {
      props['data-tour'] = item.tourId;
    }
    return props;
  }, [item.tourId]);

  return (
    <Link
      href={asRoute(item.href)}
      title={t(item.tooltip)}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
        isActive
          ? 'text-primary-dark bg-white shadow-md shadow-primary-500/5 ring-1 ring-white/60'
          : 'hover:text-primary-dark text-gray-600 hover:bg-white/40 hover:shadow-sm',
      )}
      {...linkProps}
    >
      <Icon
        size={20}
        className={cn(
          'transition-colors duration-200',
          isActive ? 'text-primary' : 'text-gray-400 group-hover:text-primary',
        )}
      />
      <span className="flex-1">{t(item.key)}</span>
      <span
        className="hidden text-[10px] text-gray-300 group-hover:text-gray-400 lg:inline"
      >
        ?
      </span>
    </Link>
  );
});

// Logo 组件
const SidebarLogo = memo(function SidebarLogo() {
  const { t } = useI18n();
  const [logoSrc, setLogoSrc] = useState('/logo-owl.png');

  return (
    <div className="mb-8 flex items-center gap-3 px-2">
      <div className="group relative inline-flex h-12 w-12 rotate-[-3deg] items-center justify-center rounded-xl border border-gray-100 bg-white p-1 shadow-sm transition-transform hover:rotate-0">
        <Image
          src={logoSrc}
          alt={t('app.logoAlt')}
          width={36}
          height={36}
          className="h-9 w-9 object-contain"
          priority
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+"
          onError={() => setLogoSrc('/logo-owl.png')}
          sizes="36px"
        />
        <span
          className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-pink-300/70 ring-2 ring-white/80"
        />
      </div>
      <div>
        <h2 className="text-lg font-bold tracking-tight text-gray-800">{t('app.brand')}</h2>
        <p className="text-xs font-medium text-gray-500">{t('app.subtitle')}</p>
      </div>
    </div>
  );
});

// 导航分组组件
interface NavGroupProps {
  group: NavGroupConfig;
  groupIndex: number;
  pathname: string | null;
  onNavigate?: () => void;
}

const NavGroup = memo(function NavGroup({
  group,
  groupIndex,
  pathname,
  onNavigate,
}: NavGroupProps) {
  const { t } = useI18n();

  const isItemActive = useCallback(
    (item: NavItemConfig): boolean => {
      if (!pathname) return false;
      if (item.exact) {
        return pathname === item.href;
      }
      // 特殊处理：/oracle/protocols 不应该匹配 /oracle/optimistic
      if (item.href === '/oracle/protocols' && pathname.startsWith('/oracle/optimistic')) {
        return false;
      }
      return pathname === item.href || pathname.startsWith(item.href + '/');
    },
    [pathname],
  );

  return (
    <div className={cn('space-y-1', groupIndex > 0 && 'mt-4 border-t border-gray-100 pt-4')}>
      <div className="px-3 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {t(group.labelKey)}
        </span>
      </div>
      {group.items.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          isActive={isItemActive(item)}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
});

// 移动端菜单按钮组件
interface MobileMenuButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

const MobileMenuButton = memo(function MobileMenuButton({
  isOpen,
  onToggle,
}: MobileMenuButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="fixed left-4 top-4 z-50 rounded-xl bg-white/50 p-2 text-[var(--foreground)] shadow-sm backdrop-blur-md md:hidden"
    >
      {isOpen ? <X size={20} /> : <Menu size={20} />}
    </button>
  );
});

// 主 Sidebar 组件
export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleOverlayClick = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      <MobileMenuButton isOpen={isOpen} onToggle={toggleMenu} />

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={handleOverlayClick}
        />
      )}

      <aside
        id="sidebar-navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/40 bg-white/70 shadow-2xl shadow-primary-500/10 backdrop-blur-xl transition-transform duration-300 ease-in-out md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col px-4 py-6">
          <SidebarLogo />

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {navGroups.map((group, groupIndex) => (
              <NavGroup
                key={group.id}
                group={group}
                groupIndex={groupIndex}
                pathname={pathname}
                onNavigate={closeMenu}
              />
            ))}
          </nav>

          <div className="border-t border-white/20 pt-4">
            <div className="w-full">
              <ConnectWallet />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
