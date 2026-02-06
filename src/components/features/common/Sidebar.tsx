'use client';

/* eslint-disable no-restricted-syntax */

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  ShieldAlert,
  Activity,
  Menu,
  X,
  User,
  ScrollText,
  KeyRound,
  Star,
  Globe,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  TrendingUp,
  Shield,
  Brain,
  ArrowRightLeft,
} from 'lucide-react';

import { ConnectWallet } from '@/components/features/wallet/ConnectWallet';
import { useOracleFilters } from '@/hooks/oracle/useOracleFilters';
import { useI18n } from '@/i18n/LanguageProvider';
import { PROTOCOL_DISPLAY_NAMES, PRICE_FEED_PROTOCOLS, OPTIMISTIC_PROTOCOLS } from '@/lib/types';
import type { OracleProtocol } from '@/lib/types';
import { cn } from '@/lib/utils';

import type { Route } from 'next';

const PROTOCOL_ICONS: Record<OracleProtocol, string> = {
  chainlink: '🔗',
  pyth: '🐍',
  band: '🎸',
  api3: '📡',
  redstone: '💎',
  switchboard: '🎛️',
  flux: '⚡',
  dia: '📊',
  uma: '⚖️',
};

const mainNavItems = [
  {
    key: 'nav.dashboard' as const,
    href: '/oracle/dashboard' as const,
    icon: LayoutDashboard,
  },
  {
    key: 'nav.unifiedOracle' as const,
    href: '/oracle/unified' as const,
    icon: Globe,
  },
  {
    key: 'nav.security' as const,
    href: '/security/dashboard' as const,
    icon: Shield,
  },
];

const secondaryNavItems = [
  {
    key: 'nav.disputes' as const,
    href: '/disputes' as const,
    icon: ShieldAlert,
  },
  { key: 'nav.alerts' as const, href: '/alerts' as const, icon: ShieldAlert },
  { key: 'nav.audit' as const, href: '/audit' as const, icon: ScrollText },
  {
    key: 'nav.adminTokens' as const,
    href: '/admin/tokens' as const,
    icon: KeyRound,
  },
  { key: 'nav.watchlist' as const, href: '/watchlist' as const, icon: Star },
  {
    key: 'nav.myAssertions' as const,
    href: '/my-assertions' as const,
    icon: User,
  },
  {
    key: 'nav.myDisputes' as const,
    href: '/my-disputes' as const,
    icon: ShieldAlert,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [logoSrc, setLogoSrc] = useState('/logo-owl.png');
  const [expandedSections, setExpandedSections] = useState({
    priceFeeds: true,
    optimistic: true,
    analytics: true,
  });
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

  const isProtocolActive = (protocol: OracleProtocol) => {
    return pathname === `/oracle/protocols/${protocol}`;
  };

  const isOptimisticActive = pathname?.startsWith('/oracle/optimistic');

  const toggleSection = (section: 'priceFeeds' | 'optimistic' | 'analytics') => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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
            {/* Main Navigation */}
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const href = attachInstanceId(item.href) as Route;

              return (
                <Link
                  key={item.href}
                  href={href}
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
                      isActive ? 'text-purple-600' : 'text-gray-400 group-hover:text-purple-500',
                    )}
                  />
                  {t(item.key)}
                </Link>
              );
            })}

            {/* Price Feed Protocols Section */}
            <div className="pt-2">
              <button
                onClick={() => toggleSection('priceFeeds')}
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
                  <span>Price Feeds</span>
                </div>
                {expandedSections.priceFeeds ? (
                  <ChevronDown size={16} className="text-gray-400" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400" />
                )}
              </button>

              {/* Price Feed Protocol List */}
              {expandedSections.priceFeeds && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                  {PRICE_FEED_PROTOCOLS.map((protocol) => {
                    const isActive = isProtocolActive(protocol);
                    const href = `/oracle/protocols/${protocol}`;

                    return (
                      <Link
                        key={protocol}
                        href={href as Route}
                        className={cn(
                          'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                          isActive
                            ? 'bg-purple-50 text-purple-700'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-purple-600',
                        )}
                      >
                        <span className="text-base">{PROTOCOL_ICONS[protocol]}</span>
                        <span className="truncate">{PROTOCOL_DISPLAY_NAMES[protocol]}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Optimistic Oracle Section */}
            <div className="pt-2">
              <button
                onClick={() => toggleSection('optimistic')}
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
                  <span>Optimistic Oracle</span>
                </div>
                {expandedSections.optimistic ? (
                  <ChevronDown size={16} className="text-gray-400" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400" />
                )}
              </button>

              {/* Optimistic Protocol List */}
              {expandedSections.optimistic && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                  <Link
                    href="/oracle/optimistic"
                    className={cn(
                      'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                      pathname === '/oracle/optimistic'
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-purple-600',
                    )}
                  >
                    <Activity size={16} className="text-gray-400" />
                    <span className="truncate">Overview</span>
                  </Link>
                  {OPTIMISTIC_PROTOCOLS.map((protocol) => {
                    const isActive = isProtocolActive(protocol);
                    const href = `/oracle/protocols/${protocol}`;

                    return (
                      <Link
                        key={protocol}
                        href={href as Route}
                        className={cn(
                          'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                          isActive
                            ? 'bg-purple-50 text-purple-700'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-purple-600',
                        )}
                      >
                        <span className="text-base">{PROTOCOL_ICONS[protocol]}</span>
                        <span className="truncate">{PROTOCOL_DISPLAY_NAMES[protocol]}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Analytics Section */}
            <div className="pt-2">
              <button
                onClick={() => toggleSection('analytics')}
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
                  <span>AI Analytics</span>
                </div>
                {expandedSections.analytics ? (
                  <ChevronDown size={16} className="text-gray-400" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400" />
                )}
              </button>

              {/* Analytics Submenu */}
              {expandedSections.analytics && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                  <a
                    href="/oracle/analytics/anomalies"
                    className={cn(
                      'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                      pathname === '/oracle/analytics/anomalies'
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-purple-600',
                    )}
                  >
                    <Brain size={16} className="text-gray-400" />
                    <span className="truncate">ML Anomalies</span>
                  </a>
                  <a
                    href="/oracle/analytics/deviation"
                    className={cn(
                      'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                      pathname === '/oracle/analytics/deviation'
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-purple-600',
                    )}
                  >
                    <ArrowRightLeft size={16} className="text-gray-400" />
                    <span className="truncate">Price Deviation</span>
                  </a>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="my-2 border-t border-gray-200" />

            {/* Secondary Navigation */}
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const href = attachInstanceId(item.href) as Route;

              return (
                <Link
                  key={item.href}
                  href={href}
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
                      isActive ? 'text-purple-600' : 'text-gray-400 group-hover:text-purple-500',
                    )}
                  />
                  {t(item.key)}
                </Link>
              );
            })}
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
