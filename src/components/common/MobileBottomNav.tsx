'use client';

import { useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  LayoutDashboard,
  Globe,
  ShieldAlert,
  Shield,
  TrendingUp,
  Menu,
  X,
  Bell,
  Settings,
  Wallet,
} from 'lucide-react';

import { useWallet } from '@/contexts/WalletContext';
import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/shared/utils';

import type { Route } from 'next';

interface NavItem {
  key: string;
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  {
    key: 'nav.dashboard',
    href: '/oracle/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    key: 'nav.unifiedOracle',
    href: '/oracle/comparison',
    icon: Globe,
    label: 'Compare',
  },
  {
    key: 'nav.alerts',
    href: '/alerts',
    icon: Bell,
    label: 'Alerts',
    badge: 0,
  },
  {
    key: 'nav.more',
    href: '#',
    icon: Menu,
    label: 'More',
  },
];

const moreNavItems: NavItem[] = [
  {
    key: 'nav.security',
    href: '/security/dashboard',
    icon: Shield,
    label: 'Security',
  },
  {
    key: 'nav.disputes',
    href: '/disputes',
    icon: ShieldAlert,
    label: 'Disputes',
  },
  {
    key: 'nav.priceFeeds',
    href: '/oracle/protocols',
    icon: TrendingUp,
    label: 'Protocols',
  },
  {
    key: 'nav.settings',
    href: '/settings',
    icon: Settings,
    label: 'Settings',
  },
];

// 钱包相关导航项
const walletNavItem: NavItem = {
  key: 'nav.wallet',
  href: '/profile',
  icon: Wallet,
  label: 'Wallet',
};

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [showMore, setShowMore] = useState(false);
  const { isConnected } = useWallet();

  const isActive = (href: string) => {
    if (href === '#') return false;
    return pathname === href || pathname?.startsWith(href);
  };

  // 根据钱包连接状态动态添加钱包入口
  const dynamicMoreNavItems = isConnected ? [walletNavItem, ...moreNavItems] : moreNavItems;

  return (
    <>
      {/* 更多菜单遮罩 */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* 更多菜单 */}
      <div
        className={cn(
          'fixed bottom-20 left-4 right-4 z-50 rounded-2xl bg-white/95 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 md:hidden',
          showMore ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
        )}
      >
        <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
          <span className="text-sm font-semibold text-gray-700">更多功能</span>
          <button onClick={() => setShowMore(false)} className="rounded-full p-1 hover:bg-gray-100">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {dynamicMoreNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.key}
                href={item.href as Route}
                onClick={() => setShowMore(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl p-3 transition-all',
                  active ? 'text-primary-dark bg-primary/5' : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                <Icon size={20} className={cn(active ? 'text-primary' : 'text-gray-400')} />
                <span className="text-sm font-medium">{t(item.key)}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 底部导航栏 */}
      <nav className="pb-safe fixed bottom-0 left-0 right-0 z-50 border-t border-white/40 bg-white/90 px-2 pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const isMore = item.key === 'nav.more';

            if (isMore) {
              return (
                <button
                  key={item.key}
                  onClick={() => setShowMore(!showMore)}
                  className={cn(
                    'relative flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all',
                    showMore ? 'text-primary-dark' : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  <div
                    className={cn('rounded-full p-1.5 transition-all', showMore && 'bg-primary/10')}
                  >
                    <Icon size={22} />
                  </div>
                  <span className="text-[10px] font-medium">{t(item.key)}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href as Route}
                className={cn(
                  'relative flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all',
                  active ? 'text-primary-dark' : 'text-gray-500 hover:text-gray-700',
                )}
              >
                <div className={cn('rounded-full p-1.5 transition-all', active && 'bg-primary/10')}>
                  <Icon size={22} />
                  {item.badge ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-[10px] font-medium">{t(item.key)}</span>
                {active && <span className="absolute -bottom-2 h-1 w-6 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
