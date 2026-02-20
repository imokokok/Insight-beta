'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';

import {
  TrendingUp,
  Globe,
  Activity,
  Search,
  Star,
  Filter,
  X,
  ChevronDown,
  Check,
} from 'lucide-react';

import { EmptyProtocolsState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { useI18n } from '@/i18n/LanguageProvider';
import { fetchApiData, cn } from '@/shared/utils';

type ProtocolType = 'Chainlink' | 'Pyth' | 'RedStone' | 'UMA' | 'API3' | 'Band';
type ChangeFilter = 'all' | 'up' | 'down';
type HealthStatus = 'healthy' | 'warning' | 'critical';

interface PriceFeed {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  sources: ProtocolType[];
  lastUpdated: string;
  health: HealthStatus;
}

interface Filters {
  protocols: ProtocolType[];
  priceMin: number;
  priceMax: number;
  change: ChangeFilter;
  health: HealthStatus[];
  search: string;
}

interface ProtocolExplorerProps {
  className?: string;
}

const PROTOCOL_OPTIONS: ProtocolType[] = ['Chainlink', 'Pyth', 'RedStone', 'UMA', 'API3', 'Band'];
const HEALTH_OPTIONS: { value: HealthStatus; labelKey: string }[] = [
  { value: 'healthy', labelKey: 'protocol.priceFeeds.health.healthy' },
  { value: 'warning', labelKey: 'protocol.priceFeeds.health.warning' },
  { value: 'critical', labelKey: 'protocol.priceFeeds.health.critical' },
];
const CHANGE_OPTIONS: { value: ChangeFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'protocol.priceFeeds.changeFilter.all' },
  { value: 'up', labelKey: 'protocol.priceFeeds.changeFilter.up' },
  { value: 'down', labelKey: 'protocol.priceFeeds.changeFilter.down' },
];

const FAVORITES_STORAGE_KEY = 'protocol-explorer-favorites';

export function ProtocolExplorer({ className }: ProtocolExplorerProps) {
  const { t } = useI18n();
  const [feeds, setFeeds] = useState<PriceFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    protocols: [],
    priceMin: 0,
    priceMax: 100000,
    change: 'all',
    health: [],
    search: '',
  });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  const toggleFavorite = useCallback((feedId: string) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(feedId)
        ? prev.filter((id) => id !== feedId)
        : [...prev, feedId];
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
      return newFavorites;
    });
  }, []);

  const fetchFeeds = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApiData<PriceFeed[]>('/api/oracle/price-feeds');
      setFeeds(data);
    } catch {
      setFeeds(generateMockFeeds());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  usePageOptimizations({
    pageName: t('protocol.priceFeeds.pageTitle'),
    onRefresh: async () => {
      await fetchFeeds();
    },
    enableSearch: false,
    showRefreshToast: true,
  });

  const filteredFeeds = useMemo(() => {
    return feeds.filter((feed) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !feed.symbol.toLowerCase().includes(searchLower) &&
          !feed.name.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      if (filters.protocols.length > 0) {
        if (!filters.protocols.some((p) => feed.sources.includes(p))) {
          return false;
        }
      }

      if (feed.price < filters.priceMin || feed.price > filters.priceMax) {
        return false;
      }

      if (filters.change === 'up' && feed.change24h < 0) {
        return false;
      }
      if (filters.change === 'down' && feed.change24h >= 0) {
        return false;
      }

      if (filters.health.length > 0 && !filters.health.includes(feed.health)) {
        return false;
      }

      return true;
    });
  }, [feeds, filters]);

  const toggleProtocol = (protocol: ProtocolType) => {
    setFilters((prev) => ({
      ...prev,
      protocols: prev.protocols.includes(protocol)
        ? prev.protocols.filter((p) => p !== protocol)
        : [...prev.protocols, protocol],
    }));
  };

  const toggleHealth = (health: HealthStatus) => {
    setFilters((prev) => ({
      ...prev,
      health: prev.health.includes(health)
        ? prev.health.filter((h) => h !== health)
        : [...prev.health, health],
    }));
  };

  const clearFilters = () => {
    setFilters({
      protocols: [],
      priceMin: 0,
      priceMax: 100000,
      change: 'all',
      health: [],
      search: '',
    });
  };

  const hasActiveFilters =
    filters.protocols.length > 0 ||
    filters.health.length > 0 ||
    filters.change !== 'all' ||
    filters.priceMin > 0 ||
    filters.priceMax < 100000;

  const handleCardClick = (feed: PriceFeed) => {
    const path = `/oracle/protocol/${feed.symbol.toLowerCase().replace('/', '-')}`;
    window.location.href = path;
  };

  return (
    <div className={className}>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('protocol.priceFeeds.totalFeeds')}
          value={feeds.length || 150}
          icon={<TrendingUp className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title={t('protocol.priceFeeds.activeSources')}
          value={10}
          icon={<Globe className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title={t('protocol.priceFeeds.avgUpdateTime')}
          value="~500ms"
          icon={<Activity className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title={t('protocol.priceFeeds.updates24h')}
          value="1.2M+"
          icon={<Activity className="h-5 w-5" />}
          loading={loading}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{t('protocol.priceFeeds.livePriceFeeds')}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder={t('protocol.priceFeeds.searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="w-48 pl-9"
                />
              </div>
              <Button
                variant={showFilters ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-1"
              >
                <Filter className="h-4 w-4" />
                {t('protocol.priceFeeds.filters')}
                {hasActiveFilters && (
                  <Badge variant="default" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    !
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="h-4 w-4" />
                  {t('protocol.priceFeeds.clearFilters')}
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-4 rounded-lg border bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('protocol.priceFeeds.protocolType')}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveDropdown(activeDropdown === 'protocol' ? null : 'protocol')
                    }
                    className="flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm"
                  >
                    <span>
                      {filters.protocols.length === 0
                        ? t('protocol.priceFeeds.allProtocols')
                        : `${filters.protocols.length} ${t('protocol.priceFeeds.selected')}`}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {activeDropdown === 'protocol' && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border bg-white p-2 shadow-lg">
                      {PROTOCOL_OPTIONS.map((protocol) => (
                        <button
                          key={protocol}
                          type="button"
                          onClick={() => toggleProtocol(protocol)}
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100"
                        >
                          <div
                            className={cn(
                              'flex h-4 w-4 items-center justify-center rounded border',
                              filters.protocols.includes(protocol)
                                ? 'border-primary bg-primary text-white'
                                : 'border-gray-300',
                            )}
                          >
                            {filters.protocols.includes(protocol) && <Check className="h-3 w-3" />}
                          </div>
                          {protocol}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('protocol.priceFeeds.priceRange')}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder={t('protocol.priceFeeds.min')}
                    value={filters.priceMin || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        priceMin: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full"
                  />
                  <span className="text-gray-400">-</span>
                  <Input
                    type="number"
                    placeholder={t('protocol.priceFeeds.max')}
                    value={filters.priceMax === 100000 ? '' : filters.priceMax}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        priceMax: Number(e.target.value) || 100000,
                      }))
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('protocol.priceFeeds.change24h')}
                </label>
                <div className="flex gap-1">
                  {CHANGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, change: option.value }))}
                      className={cn(
                        'flex-1 rounded-md px-3 py-2 text-sm transition-colors',
                        filters.change === option.value
                          ? 'bg-primary text-white'
                          : 'border bg-white hover:bg-gray-50',
                      )}
                    >
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('protocol.priceFeeds.healthStatus')}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === 'health' ? null : 'health')}
                    className="flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm"
                  >
                    <span>
                      {filters.health.length === 0
                        ? t('protocol.priceFeeds.allStatus')
                        : `${filters.health.length} ${t('protocol.priceFeeds.selected')}`}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {activeDropdown === 'health' && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border bg-white p-2 shadow-lg">
                      {HEALTH_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleHealth(option.value)}
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100"
                        >
                          <div
                            className={cn(
                              'flex h-4 w-4 items-center justify-center rounded border',
                              filters.health.includes(option.value)
                                ? 'border-primary bg-primary text-white'
                                : 'border-gray-300',
                            )}
                          >
                            {filters.health.includes(option.value) && <Check className="h-3 w-3" />}
                          </div>
                          <HealthBadge health={option.value} t={t} labelKey={option.labelKey} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : filteredFeeds.length === 0 ? (
            <EmptyProtocolsState
              onExplore={() => {
                clearFilters();
              }}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFeeds.map((feed) => (
                <PriceFeedCard
                  key={feed.id}
                  feed={feed}
                  t={t}
                  isFavorite={favorites.includes(feed.id)}
                  onToggleFavorite={() => toggleFavorite(feed.id)}
                  onClick={() => handleCardClick(feed)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PriceFeedCard({
  feed,
  t,
  isFavorite,
  onToggleFavorite,
  onClick,
}: {
  feed: PriceFeed;
  t: (key: string) => string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}) {
  const isPositive = feed.change24h >= 0;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{feed.symbol}</h3>
          <p className="text-sm text-gray-500">{feed.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <HealthBadge health={feed.health} t={t} />
          <button
            type="button"
            onClick={handleFavoriteClick}
            className="rounded p-1 transition-colors hover:bg-gray-100"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              className={cn(
                'h-5 w-5',
                isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
              )}
            />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-bold text-gray-900">${feed.price.toLocaleString()}</div>
        <div
          className={cn(
            'flex items-center text-sm',
            isPositive ? 'text-green-600' : 'text-red-600',
          )}
        >
          <span>
            {isPositive ? '+' : ''}
            {feed.change24h.toFixed(2)}%
          </span>
          <span className="ml-2 text-gray-400">{t('protocol.priceFeeds.hours24')}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        {feed.sources.slice(0, 3).map((source) => (
          <Badge key={source} variant="secondary" className="text-xs">
            {source}
          </Badge>
        ))}
        {feed.sources.length > 3 && (
          <Badge variant="secondary" className="text-xs">
            +{feed.sources.length - 3}
          </Badge>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
        <span>
          {t('protocol.priceFeeds.vol')}: ${(feed.volume24h / 1e9).toFixed(2)}B
        </span>
        <span>{new Date(feed.lastUpdated).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

function HealthBadge({
  health,
  t,
  labelKey,
}: {
  health: HealthStatus;
  t: (key: string) => string;
  labelKey?: string;
}) {
  const config = {
    healthy: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      dot: 'bg-green-500',
    },
    warning: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      dot: 'bg-yellow-500',
    },
    critical: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      dot: 'bg-red-500',
    },
  };

  const { bg, text, dot } = config[health];
  const label = labelKey ? t(labelKey) : t(`protocol.priceFeeds.health.${health}`);

  return (
    <Badge variant="secondary" className={cn('gap-1 text-xs', bg, text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {label}
    </Badge>
  );
}

function StatCard({
  title,
  value,
  icon,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-8 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">{title}</span>
          <div className="rounded-lg bg-primary/5 p-2 text-primary">{icon}</div>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  );
}

function generateMockFeeds(): PriceFeed[] {
  const symbols = [
    { symbol: 'BTC/USD', name: 'Bitcoin' },
    { symbol: 'ETH/USD', name: 'Ethereum' },
    { symbol: 'LINK/USD', name: 'Chainlink' },
    { symbol: 'MATIC/USD', name: 'Polygon' },
    { symbol: 'AVAX/USD', name: 'Avalanche' },
    { symbol: 'SOL/USD', name: 'Solana' },
    { symbol: 'UNI/USD', name: 'Uniswap' },
    { symbol: 'AAVE/USD', name: 'Aave' },
    { symbol: 'COMP/USD', name: 'Compound' },
    { symbol: 'MKR/USD', name: 'Maker' },
    { symbol: 'SNX/USD', name: 'Synthetix' },
    { symbol: 'YFI/USD', name: 'Yearn Finance' },
  ];

  const protocolCombos: ProtocolType[][] = [
    ['Chainlink', 'Pyth'],
    ['Chainlink', 'RedStone'],
    ['Pyth', 'UMA'],
    ['Chainlink', 'API3', 'Band'],
    ['RedStone', 'Pyth'],
    ['Chainlink'],
    ['UMA', 'API3'],
    ['Band', 'Chainlink', 'Pyth'],
    ['RedStone'],
    ['API3', 'Chainlink'],
  ];

  const healthStatuses: HealthStatus[] = ['healthy', 'warning', 'critical'];

  return symbols.map((s, i) => {
    const healthIndex = Math.floor(Math.random() * 10) < 7 ? 0 : Math.floor(Math.random() * 3);
    return {
      id: `feed-${i}`,
      symbol: s.symbol,
      name: s.name,
      price: Math.random() * 50000 + 10,
      change24h: (Math.random() - 0.5) * 20,
      volume24h: Math.random() * 10e9,
      sources: protocolCombos[i % protocolCombos.length] || ['Chainlink'],
      lastUpdated: new Date().toISOString(),
      health: healthStatuses[healthIndex] ?? 'healthy',
    };
  });
}
