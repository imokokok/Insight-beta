'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  ShieldAlert,
  Menu,
  X,
  ScrollText,
  Star,
  Globe,
  ChevronRight,
  LayoutDashboard,
  TrendingUp,
  Shield,
  Brain,
} from 'lucide-react';

import { ConnectWallet } from '@/components/features/wallet/ConnectWallet';
import { useOracleFilters } from '@/hooks';
import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/lib/utils';

import type { Route } from 'next';

// 导航分组 - 体现"预言机监控"的任务结构
const navGroups = [
  {
    id: 'monitor' as const,
    label: '监控',
    labelEn: 'Monitor',
    items: [
      {
        key: 'nav.dashboard' as const,
        href: '/oracle/dashboard' as const,
        icon: LayoutDashboard,
        tooltip: '实时监控仪表板，查看系统健康状态',
      },
      {
        key: 'nav.unifiedOracle' as const,
        href: '/oracle/unified' as const,
        icon: Globe,
        tooltip: '统一视图，跨协议对比分析',
      },
      {
        key: 'nav.security' as const,
        href: '/security/dashboard' as const,
        icon: Shield,
        tooltip: '安全检测与风险监控',
      },
    ],
  },
  {
    id: 'handle' as const,
    label: '处置',
    labelEn: 'Handle',
    items: [
      {
        key: 'nav.alerts' as const,
        href: '/alerts' as const,
        icon: ShieldAlert,
        tooltip: '告警管理：查看、确认、处理系统告警',
      },
      {
        key: 'nav.disputes' as const,
        href: '/disputes' as const,
        icon: ShieldAlert,
        tooltip: '争议处理：查看和参与预言机争议',
      },
    ],
  },
  {
    id: 'operate' as const,
    label: '运营',
    labelEn: 'Operate',
    items: [
      {
        key: 'nav.audit' as const,
        href: '/audit' as const,
        icon: ScrollText,
        tooltip: '审计日志与合规报告',
      },
      {
        key: 'nav.watchlist' as const,
        href: '/watchlist' as const,
        icon: Star,
        tooltip: '关注列表：自定义监控项',
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [logoSrc, setLogoSrc] = useState('/logo-owl.png');
  const { t } = useI18n();
  const { instanceId } = useOracleFilters();
  const instanceIdFromUrl = searchParams?.get('instanceId')?.trim() || null;
  const effectiveInstanceId = instanceIdFromUrl ?? instanceId;

  const attachInstanceId = (href: string) => {
    const normalized = (effectiveInstanceId ?? '').trim();
    if (!normalized) return href;
    const url = new URL(href, 'http://oracle-monitor.local');
    url.searchParams.set('instanceId', normalized);
    return `${url.pathname}${url.search}${url.hash}`;
  };

  const isOptimisticActive = pathname?.startsWith('/oracle/optimistic');

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 rounded-xl bg-white/50 p-2 text-purple-900 shadow-sm backdrop-blur-md md:hidden"
        aria-label={isOpen ? t('common.closeMenu') : t('common.openMenu')}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/40 bg-white/70 shadow-2xl shadow-purple-500/10 backdrop-blur-xl transition-transform duration-300 ease-in-out md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label={t('common.sidebar')}
      >
        <div className="flex h-full flex-col px-4 py-6">
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
                onError={() => setLogoSrc('/logo-owl.svg')}
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

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {/* 导航分组 - 体现"预言机监控"的任务结构 */}
            {navGroups.map((group, groupIndex) => (
              <div
                key={group.id}
                className={cn('space-y-1', groupIndex > 0 && 'mt-4 border-t border-gray-100 pt-4')}
              >
                {/* 分组标题 */}
                <div className="px-3 py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {group.label}
                  </span>
                </div>
                {/* 分组内导航项 */}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const href = attachInstanceId(item.href) as Route;

                  return (
                    <Link
                      key={item.href}
                      href={href}
                      title={item.tooltip}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-white text-purple-700 shadow-md shadow-purple-500/5 ring-1 ring-white/60'
                          : 'text-gray-600 hover:bg-white/40 hover:text-purple-700 hover:shadow-sm',
                      )}
                    >
                      <Icon
                        size={20}
                        className={cn(
                          'transition-colors duration-200',
                          isActive
                            ? 'text-purple-600'
                            : 'text-gray-400 group-hover:text-purple-500',
                        )}
                      />
                      <span className="flex-1">{t(item.key)}</span>
                      {/* Tooltip 指示器 */}
                      <span className="hidden text-[10px] text-gray-300 group-hover:text-gray-400 lg:inline">
                        ?
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}

            {/* Price Feed Protocols Section */}
            <div className="mt-4 space-y-1 border-t border-gray-100 pt-4">
              <div className="px-3 py-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  协议
                </span>
              </div>
              <Link
                href="/oracle/protocols"
                title="查看各协议详细数据"
                className={cn(
                  'group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  pathname?.startsWith('/oracle/protocols') && !isOptimisticActive
                    ? 'bg-white text-purple-700 shadow-md shadow-purple-500/5 ring-1 ring-white/60'
                    : 'text-gray-600 hover:bg-white/40 hover:text-purple-700 hover:shadow-sm',
                )}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp
                    size={20}
                    className={cn(
                      'transition-colors duration-200',
                      pathname?.startsWith('/oracle/protocols') && !isOptimisticActive
                        ? 'text-purple-600'
                        : 'text-gray-400 group-hover:text-purple-500',
                    )}
                  />
                  <span>{t('nav.priceFeeds')}</span>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </Link>
            </div>

            {/* Optimistic Oracle Section */}
            <div className="space-y-1">
              <Link
                href="/oracle/optimistic"
                title="乐观预言机争议与断言"
                className={cn(
                  'group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isOptimisticActive
                    ? 'bg-white text-purple-700 shadow-md shadow-purple-500/5 ring-1 ring-white/60'
                    : 'text-gray-600 hover:bg-white/40 hover:text-purple-700 hover:shadow-sm',
                )}
              >
                <div className="flex items-center gap-3">
                  <Shield
                    size={20}
                    className={cn(
                      'transition-colors duration-200',
                      isOptimisticActive
                        ? 'text-purple-600'
                        : 'text-gray-400 group-hover:text-purple-500',
                    )}
                  />
                  <span>{t('nav.optimisticOracle')}</span>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </Link>
            </div>

            {/* Analytics Section */}
            <div className="space-y-1">
              <Link
                href="/oracle/analytics"
                title="AI 驱动的深度分析"
                className={cn(
                  'group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  pathname?.startsWith('/oracle/analytics')
                    ? 'bg-white text-purple-700 shadow-md shadow-purple-500/5 ring-1 ring-white/60'
                    : 'text-gray-600 hover:bg-white/40 hover:text-purple-700 hover:shadow-sm',
                )}
              >
                <div className="flex items-center gap-3">
                  <Brain
                    size={20}
                    className={cn(
                      'transition-colors duration-200',
                      pathname?.startsWith('/oracle/analytics')
                        ? 'text-purple-600'
                        : 'text-gray-400 group-hover:text-purple-500',
                    )}
                  />
                  <span>{t('nav.aiAnalytics')}</span>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </Link>
            </div>
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
