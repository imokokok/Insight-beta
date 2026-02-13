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
  label: string;
  labelEn: string;
  items: NavItemConfig[];
}

// 导航分组配置 - 统一配置所有导航项
const navGroups: NavGroupConfig[] = [
  {
    id: 'monitor',
    label: '监控',
    labelEn: 'Monitor',
    items: [
      {
        key: 'nav.dashboard',
        href: '/oracle/dashboard',
        icon: LayoutDashboard,
        tooltip: '实时监控仪表板，查看系统健康状态',
        tourId: 'dashboard',
      },
      {
        key: 'nav.unifiedOracle',
        href: '/oracle/comparison',
        icon: Globe,
        tooltip: '统一视图，跨协议对比分析',
      },
      {
        key: 'nav.security',
        href: '/security/dashboard',
        icon: Shield,
        tooltip: '安全检测与风险监控',
      },
    ],
  },
  {
    id: 'handle',
    label: '处置',
    labelEn: 'Handle',
    items: [
      {
        key: 'nav.alerts',
        href: '/alerts',
        icon: ShieldAlert,
        tooltip: '告警管理：查看、确认、处理系统告警',
        tourId: 'alerts',
      },
      {
        key: 'nav.disputes',
        href: '/disputes',
        icon: ShieldAlert,
        tooltip: '争议处理：查看和参与预言机争议',
      },
    ],
  },
  {
    id: 'operate',
    label: '运营',
    labelEn: 'Operate',
    items: [
      {
        key: 'nav.audit',
        href: '/audit',
        icon: ScrollText,
        tooltip: '审计日志与合规报告',
      },
      {
        key: 'nav.watchlist',
        href: '/watchlist',
        icon: Star,
        tooltip: '关注列表：自定义监控项',
        tourId: 'watchlist',
      },
    ],
  },
  {
    id: 'slo',
    label: 'SLO',
    labelEn: 'SLO',
    items: [
      {
        key: 'nav.slo',
        href: '/oracle/slo-v2',
        icon: Target,
        tooltip: 'SLO / Error Budget 监控视图',
      },
      {
        key: 'nav.timeline',
        href: '/oracle/timeline',
        icon: Clock,
        tooltip: '事件时间线：告警、争议、部署等',
      },
    ],
  },
  {
    id: 'protocols',
    label: '协议',
    labelEn: 'Protocols',
    items: [
      {
        key: 'nav.priceFeeds',
        href: '/oracle/protocols',
        icon: TrendingUp,
        tooltip: '查看各协议详细数据',
      },
      {
        key: 'nav.optimisticOracle',
        href: '/oracle/optimistic',
        icon: ShieldCheck,
        tooltip: '乐观预言机争议与断言',
      },
      {
        key: 'nav.crossChain',
        href: '/cross-chain',
        icon: Link2,
        tooltip: '跨链价格对比与套利分析',
      },
      {
        key: 'nav.aiAnalytics',
        href: '/oracle/analytics',
        icon: Brain,
        tooltip: 'AI 驱动的深度分析',
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
      title={item.tooltip}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
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
        aria-hidden="true"
      />
      <span className="flex-1">{t(item.key)}</span>
      <span
        className="hidden text-[10px] text-gray-300 group-hover:text-gray-400 lg:inline"
        aria-hidden="true"
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
          aria-hidden="true"
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
          {group.label}
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
  const { t } = useI18n();

  return (
    <button
      onClick={onToggle}
      className="fixed left-4 top-4 z-50 rounded-xl bg-white/50 p-2 text-[var(--foreground)] shadow-sm backdrop-blur-md md:hidden"
      aria-label={isOpen ? t('common.closeMenu') : t('common.openMenu')}
      aria-expanded={isOpen}
      aria-controls="sidebar-navigation"
    >
      {isOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
    </button>
  );
});

// 主 Sidebar 组件
export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

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
          aria-hidden="true"
        />
      )}

      <aside
        id="sidebar-navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/40 bg-white/70 shadow-2xl shadow-primary-500/10 backdrop-blur-xl transition-transform duration-300 ease-in-out md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label={t('common.sidebar')}
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
