'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

import { Gavel, TrendingUp, LayoutDashboard, Users, AlertTriangle, Wallet } from 'lucide-react';

import { ContentSection, ContentGrid } from '@/components/common';
import { useProtocolData } from '@/components/oracle/hooks/useProtocolData';
import {
  ProtocolPageLayout,
  TabPanelWrapper,
  type TabItem,
  type KpiCardData,
} from '@/components/oracle/layouts/ProtocolPageLayout';
import {
  DisputeDetailModal,
  AssertionDetailModal,
  VoterHistoryModal,
} from '@/components/oracle/uma';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { HistoricalDisputeStats } from '@/features/oracle/uma/components/HistoricalDisputeStats';
import { TvlTrendAnalysis } from '@/features/oracle/uma/components/TvlTrendAnalysis';
import { VotingAnalysisPanel } from '@/features/oracle/uma/components/VotingAnalysisPanel';
import { useWallet } from '@/features/wallet/contexts/WalletContext';
import { useI18n } from '@/i18n';
import { logger } from '@/shared/logger';
import { formatTime } from '@/shared/utils/format/date';
import { cn } from '@/shared/utils/ui';
import type { NetworkHealthStatus } from '@/types/common';

import type { Route } from 'next';

interface Assertion {
  id: string;
  assertionId: string;
  identifier: string;
  claim: string;
  proposer: string;
  bond: string;
  challengeBond: string;
  status: 'pending' | 'disputed' | 'resolved' | 'settled';
  chain: string;
  blockNumber: number;
  txHash: string;
  timestamp: string;
  expirationTimestamp: string;
  resolutionTimestamp?: string;
  settlementTimestamp?: string;
  challenger?: string;
  settledPrice?: string;
  isMock?: boolean;
}

interface Dispute {
  id: string;
  assertionId: string;
  chain: string;
  identifier: string | null;
  ancillaryData: string | null;
  disputer: string;
  disputeBond: string;
  disputedAt: string;
  votingEndsAt: string | null;
  status: string;
  currentVotesFor: string;
  currentVotesAgainst: string;
  totalVotes: string;
  txHash: string;
  blockNumber: number;
  logIndex: number;
  version: string;
  createdAt: string;
  updatedAt: string;
}

interface AssertionsResponse {
  assertions: Assertion[];
  total: number;
  metadata: {
    source: string;
    lastUpdated: string;
  };
}

interface DisputesResponse {
  disputes: Dispute[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  metadata: {
    source: string;
    lastUpdated: string;
  };
}

interface TvlResponse {
  total: string;
  breakdown: Record<string, string>;
  metadata: {
    source: string;
    lastUpdated: string;
  };
}

interface TvlDataPoint {
  timestamp: string;
  tvl: number;
  assertionCount?: number;
}

interface Vote {
  voter: string;
  support: boolean;
  votingPower: string;
  timestamp: string;
  txHash: string;
}

interface DisputeWithVotes {
  id: string;
  assertionId: string;
  votes: Vote[];
  votingEndsAt: string | null;
  status: string;
}

interface VotersResponse {
  voters: Array<{
    address: string;
    totalVotes: number;
    successfulVotes: number;
    failedVotes: number;
    totalBond: string;
    reputation: number;
  }>;
  metadata: {
    total: number;
    source: string;
    lastUpdated: string;
  };
}

interface UmaDashboardData {
  assertionsData: AssertionsResponse | null;
  tvlData: TvlResponse | null;
  votersData: VotersResponse | null;
  healthStatus: NetworkHealthStatus | null;
}

function transformUmaData(raw: unknown): UmaDashboardData {
  const response = raw as {
    assertions?: AssertionsResponse;
    tvl?: TvlResponse;
    voters?: VotersResponse;
    health?: NetworkHealthStatus;
  };

  return {
    assertionsData: response.assertions ?? null,
    tvlData: response.tvl ?? null,
    votersData: response.voters ?? null,
    healthStatus: response.health ?? null,
  };
}

const getTabs = (t: (key: string) => string): TabItem[] => [
  { id: 'overview', label: t('uma.tabs.overview'), icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'assertions', label: t('uma.tabs.assertions'), icon: <Gavel className="h-4 w-4" /> },
  { id: 'disputes', label: t('uma.tabs.disputes'), icon: <AlertTriangle className="h-4 w-4" /> },
  { id: 'voters', label: t('uma.tabs.voters'), icon: <Users className="h-4 w-4" /> },
  { id: 'analysis', label: t('uma.tabs.analysis'), icon: <TrendingUp className="h-4 w-4" /> },
];

type FilterType = 'all' | 'mine';

interface FilterButtonsProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  allLabel: string;
  mineLabel: string;
  isConnected: boolean;
}

function FilterButtons({
  filter,
  onFilterChange,
  allLabel,
  mineLabel,
  isConnected,
}: FilterButtonsProps) {
  const { t } = useI18n();

  return (
    <div className="mb-4 flex items-center gap-2">
      <Button
        variant={filter === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFilterChange('all')}
      >
        {allLabel}
      </Button>
      <Button
        variant={filter === 'mine' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFilterChange('mine')}
        disabled={!isConnected}
      >
        {mineLabel}
      </Button>
      {!isConnected && (
        <span className="ml-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Wallet className="h-3 w-3" />
          {t('wallet.connectToView')}
        </span>
      )}
    </div>
  );
}

export default function UmaPage() {
  const { t } = useI18n();
  const { address, isConnected } = useWallet();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [disputesData, setDisputesData] = useState<DisputesResponse | null>(null);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [selectedAssertion, setSelectedAssertion] = useState<Assertion | null>(null);
  const [selectedVoterAddress, setSelectedVoterAddress] = useState<string | null>(null);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [assertionModalOpen, setAssertionModalOpen] = useState(false);
  const [voterModalOpen, setVoterModalOpen] = useState(false);

  const urlFilter = searchParams?.get('filter') as FilterType | null;
  const urlTab = searchParams?.get('tab') as string | null;
  const [assertionsFilter, setAssertionsFilter] = useState<FilterType>(
    urlFilter === 'mine' && urlTab === 'assertions' ? 'mine' : 'all',
  );
  const [disputesFilter, setDisputesFilter] = useState<FilterType>(
    urlFilter === 'mine' && urlTab === 'disputes' ? 'mine' : 'all',
  );

  const TABS = useMemo(() => getTabs(t), [t]);

  const { data, isLoading, isRefreshing, isError, error, lastUpdated, refresh } =
    useProtocolData<UmaDashboardData>({
      protocol: 'uma',
      endpoint: '/api/oracle/uma/dashboard',
      refreshInterval: autoRefreshEnabled ? refreshInterval : 0,
      enabled: true,
      transformData: transformUmaData,
    });

  const fetchDisputes = useCallback(async (disputer?: string) => {
    setDisputesLoading(true);
    try {
      const params = new URLSearchParams();
      if (disputer) {
        params.set('disputer', disputer);
      }
      const response = await fetch(`/api/oracle/uma/disputes?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setDisputesData(result.data);
      }
    } catch (err) {
      logger.error('Failed to fetch disputes', { error: err });
    } finally {
      setDisputesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (disputesFilter === 'mine' && address) {
      fetchDisputes(address);
    } else {
      fetchDisputes();
    }
  }, [disputesFilter, address, fetchDisputes]);

  const updateUrlParams = useCallback(
    (tab: string, filter: FilterType) => {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('tab', tab);
      if (filter === 'mine') {
        params.set('filter', 'mine');
      } else {
        params.delete('filter');
      }
      router.replace(`${pathname}?${params.toString()}` as Route, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const handleAssertionsFilterChange = useCallback(
    (filter: FilterType) => {
      setAssertionsFilter(filter);
      updateUrlParams('assertions', filter);
    },
    [updateUrlParams],
  );

  const handleDisputesFilterChange = useCallback(
    (filter: FilterType) => {
      setDisputesFilter(filter);
      updateUrlParams('disputes', filter);
    },
    [updateUrlParams],
  );

  const healthStatus: NetworkHealthStatus = useMemo(() => {
    if (!data?.assertionsData?.assertions) return 'healthy';
    const disputedCount = data.assertionsData.assertions.filter(
      (a) => a.status === 'disputed',
    ).length;
    const totalCount = data.assertionsData.assertions.length;
    if (totalCount === 0) return 'healthy';
    const disputedRatio = disputedCount / totalCount;
    if (disputedRatio < 0.1) return 'healthy';
    if (disputedRatio < 0.3) return 'warning';
    return 'critical';
  }, [data?.assertionsData?.assertions]);

  const kpiCards: KpiCardData[] = useMemo(() => {
    const assertions = data?.assertionsData?.assertions ?? [];
    const tvl = data?.tvlData?.total ?? '0';

    const pendingCount = assertions.filter((a) => a.status === 'pending').length;
    const disputedCount = assertions.filter((a) => a.status === 'disputed').length;

    return [
      {
        value: assertions.length.toString(),
        label: t('uma.kpi.totalAssertions'),
        trend: assertions.length > 0 ? 'up' : 'neutral',
        status: 'neutral',
      },
      {
        value: pendingCount.toString(),
        label: t('uma.kpi.pending'),
        trend: 'neutral',
        status: pendingCount > 5 ? 'warning' : 'neutral',
      },
      {
        value: disputedCount.toString(),
        label: t('uma.kpi.disputed'),
        trend: 'neutral',
        status: disputedCount > 0 ? 'error' : 'success',
      },
      {
        value: `$${Number(tvl).toLocaleString()}`,
        label: t('uma.kpi.tvl'),
        trend: 'neutral',
        status: 'neutral',
      },
    ];
  }, [data, t]);

  const handleToggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled((prev) => !prev);
  }, []);

  const handleRefreshIntervalChange = useCallback((interval: number) => {
    setRefreshInterval(interval);
  }, []);

  const handleExport = useCallback(() => {
    if (!data) return;

    const exportData = {
      assertionsData: data.assertionsData,
      tvlData: data.tvlData,
      votersData: data.votersData,
      generatedAt: lastUpdated?.toISOString() || new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uma-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data, lastUpdated]);

  const allAssertions = useMemo(
    () => data?.assertionsData?.assertions ?? [],
    [data?.assertionsData?.assertions],
  );
  const voters = data?.votersData?.voters ?? [];
  const loading = isLoading || isRefreshing;

  const assertions = useMemo(() => {
    if (assertionsFilter === 'mine' && address) {
      return allAssertions.filter((a) => a.proposer.toLowerCase() === address.toLowerCase());
    }
    return allAssertions;
  }, [allAssertions, assertionsFilter, address]);

  const disputes = useMemo(() => {
    const allDisputes = disputesData?.disputes ?? [];
    if (disputesFilter === 'mine' && address) {
      return allDisputes.filter((d) => d.disputer.toLowerCase() === address.toLowerCase());
    }
    return allDisputes;
  }, [disputesData, disputesFilter, address]);

  const statusCounts = {
    pending: allAssertions.filter((a) => a.status === 'pending').length,
    disputed: allAssertions.filter((a) => a.status === 'disputed').length,
    resolved: allAssertions.filter((a) => a.status === 'resolved').length,
    settled: allAssertions.filter((a) => a.status === 'settled').length,
  };

  const mockTvlData = useMemo<TvlDataPoint[]>(() => {
    const data: TvlDataPoint[] = [];
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString();
      const baseTvl = 50000000;
      const randomFactor = Math.random() * 10000000 - 5000000;
      const trend = i * 100000;
      data.push({
        timestamp,
        tvl: baseTvl + randomFactor + trend,
        assertionCount: Math.floor(Math.random() * 50) + 10,
      });
    }
    return data;
  }, []);

  const mockDisputesWithVotes = useMemo<DisputeWithVotes[]>(() => {
    return allAssertions
      .filter((a) => a.status === 'disputed' || a.status === 'resolved')
      .slice(0, 5)
      .map((assertion) => ({
        id: assertion.id,
        assertionId: assertion.assertionId,
        votingEndsAt: assertion.expirationTimestamp,
        status: assertion.status,
        votes: Array.from({ length: Math.floor(Math.random() * 20) + 5 }, (_, i) => ({
          voter: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          support: Math.random() > 0.5,
          votingPower: (Math.floor(Math.random() * 1000) + 100).toString(),
          timestamp: new Date(new Date(assertion.timestamp).getTime() + i * 3600000).toISOString(),
          txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        })),
      }));
  }, [allAssertions]);

  const transformAssertionToDispute = useCallback((assertion: Assertion): Dispute => {
    return {
      id: assertion.id,
      assertionId: assertion.assertionId,
      chain: assertion.chain,
      identifier: null,
      ancillaryData: null,
      disputer: assertion.challenger || 'unknown',
      disputeBond: assertion.challengeBond,
      disputedAt: assertion.timestamp,
      votingEndsAt: null,
      status: assertion.status,
      currentVotesFor: '0',
      currentVotesAgainst: '0',
      totalVotes: '0',
      txHash: assertion.txHash,
      blockNumber: assertion.blockNumber,
      logIndex: 0,
      version: '1.0',
      createdAt: assertion.timestamp,
      updatedAt: assertion.timestamp,
    };
  }, []);

  return (
    <>
      <ProtocolPageLayout
        protocol="uma"
        title="UMA"
        icon={<Gavel className="h-5 w-5" />}
        description={t('uma.description')}
        healthStatus={healthStatus}
        kpiCards={kpiCards}
        tabs={TABS}
        loading={isLoading}
        error={isError ? (error?.message ?? 'Failed to load data') : null}
        lastUpdated={lastUpdated}
        autoRefreshEnabled={autoRefreshEnabled}
        onToggleAutoRefresh={handleToggleAutoRefresh}
        refreshInterval={refreshInterval}
        onRefreshIntervalChange={handleRefreshIntervalChange}
        onRefresh={refresh}
        onExport={handleExport}
      >
        <TabPanelWrapper tabId="overview">
          <div className="space-y-6">
            <ContentSection title={t('uma.overview.recentActivity')}>
              <div className="rounded-lg border border-border bg-card p-4">
                {loading ? (
                  <Skeleton className="h-32 w-full" />
                ) : allAssertions.length > 0 ? (
                  <div className="space-y-3">
                    {allAssertions.slice(0, 5).map((assertion) => (
                      <div
                        key={assertion.id}
                        className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'h-2 w-2 rounded-full',
                              assertion.status === 'pending' && 'bg-yellow-500',
                              assertion.status === 'disputed' && 'bg-red-500',
                              assertion.status === 'resolved' && 'bg-green-500',
                              assertion.status === 'settled' && 'bg-blue-500',
                            )}
                          />
                          <div>
                            <p className="text-sm font-medium">{assertion.identifier}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(assertion.timestamp)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            assertion.status === 'disputed'
                              ? 'destructive'
                              : assertion.status === 'pending'
                                ? 'secondary'
                                : 'default'
                          }
                        >
                          {assertion.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">{t('common.noData')}</p>
                )}
              </div>
            </ContentSection>

            <ContentSection title={t('uma.overview.stats')}>
              <ContentGrid columns={3}>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{t('uma.overview.totalResolved')}</p>
                  <p className="text-2xl font-bold">
                    {statusCounts.resolved + statusCounts.settled}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{t('uma.overview.successRate')}</p>
                  <p className="text-2xl font-bold">
                    {allAssertions.length > 0
                      ? `${Math.round((statusCounts.settled / allAssertions.length) * 100)}%`
                      : 'N/A'}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{t('uma.overview.avgBond')}</p>
                  <p className="text-2xl font-bold">
                    {allAssertions.length > 0
                      ? `$${Math.round(
                          allAssertions.reduce((sum, a) => sum + Number(a.bond), 0) /
                            allAssertions.length,
                        ).toLocaleString()}`
                      : 'N/A'}
                  </p>
                </div>
              </ContentGrid>
            </ContentSection>
          </div>
        </TabPanelWrapper>

        <TabPanelWrapper tabId="assertions">
          <ContentSection title={t('uma.assertions.title')}>
            <FilterButtons
              filter={assertionsFilter}
              onFilterChange={handleAssertionsFilterChange}
              allLabel={t('uma.filters.all')}
              mineLabel={t('uma.filters.mine')}
              isConnected={isConnected}
            />
            <div className="rounded-lg border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('uma.assertions.identifier')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('uma.assertions.status')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('uma.assertions.bond')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('uma.assertions.chain')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('uma.assertions.timestamp')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ) : assertions.length > 0 ? (
                      assertions.map((assertion) => (
                        <tr
                          key={assertion.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedAssertion(assertion);
                            setAssertionModalOpen(true);
                          }}
                        >
                          <td className="px-4 py-3 text-sm">{assertion.identifier}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                assertion.status === 'disputed'
                                  ? 'destructive'
                                  : assertion.status === 'pending'
                                    ? 'secondary'
                                    : 'default'
                              }
                            >
                              {assertion.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            ${Number(assertion.bond).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm capitalize">{assertion.chain}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatTime(assertion.timestamp)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          {assertionsFilter === 'mine' && !isConnected
                            ? t('wallet.connectToView')
                            : t('common.noData')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </ContentSection>
        </TabPanelWrapper>

        <TabPanelWrapper tabId="disputes">
          <ContentSection title={t('uma.disputes.title')}>
            <FilterButtons
              filter={disputesFilter}
              onFilterChange={handleDisputesFilterChange}
              allLabel={t('uma.filters.all')}
              mineLabel={t('uma.filters.mine')}
              isConnected={isConnected}
            />
            <div className="rounded-lg border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('uma.disputes.assertionId')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('uma.disputes.disputer')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('uma.disputes.disputeBond')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('uma.disputes.status')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('uma.disputes.votingEnds')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {disputesLoading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ) : disputes.length > 0 ? (
                      disputes.map((dispute) => (
                        <tr
                          key={dispute.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedDispute(dispute);
                            setDisputeModalOpen(true);
                          }}
                        >
                          <td className="px-4 py-3 font-mono text-sm">
                            {dispute.assertionId.slice(0, 10)}...{dispute.assertionId.slice(-8)}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">
                            {dispute.disputer.slice(0, 6)}...{dispute.disputer.slice(-4)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            ${Number(dispute.disputeBond).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                dispute.status === 'active'
                                  ? 'destructive'
                                  : dispute.status === 'pending'
                                    ? 'secondary'
                                    : 'default'
                              }
                            >
                              {dispute.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {dispute.votingEndsAt ? formatTime(dispute.votingEndsAt) : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          {disputesFilter === 'mine' && !isConnected
                            ? t('wallet.connectToView')
                            : t('uma.disputes.noDisputes')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </ContentSection>
        </TabPanelWrapper>

        <TabPanelWrapper tabId="voters">
          <ContentSection title={t('uma.voters.title')}>
            <div className="rounded-lg border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('uma.voters.address')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('uma.voters.totalVotes')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('uma.voters.successRate')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('uma.voters.reputation')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ) : voters.length > 0 ? (
                      voters.map((voter) => (
                        <tr key={voter.address} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <button
                              className="cursor-pointer font-mono text-sm text-primary hover:underline"
                              onClick={() => {
                                setSelectedVoterAddress(voter.address);
                                setVoterModalOpen(true);
                              }}
                            >
                              {voter.address.slice(0, 6)}...{voter.address.slice(-4)}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm">{voter.totalVotes}</td>
                          <td className="px-4 py-3 text-sm">
                            {voter.totalVotes > 0
                              ? `${Math.round((voter.successfulVotes / voter.totalVotes) * 100)}%`
                              : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${Math.min(voter.reputation, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm">{voter.reputation}</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          {t('common.noData')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </ContentSection>
        </TabPanelWrapper>

        <TabPanelWrapper tabId="analysis">
          <div className="space-y-6">
            <TvlTrendAnalysis tvlData={mockTvlData} isLoading={loading} />

            <div className="grid gap-6 lg:grid-cols-2">
              <VotingAnalysisPanel disputes={mockDisputesWithVotes} />
              <HistoricalDisputeStats disputes={allAssertions.map(transformAssertionToDispute)} />
            </div>

            <ContentSection title={t('uma.analysis.chainDistribution')}>
              <div className="rounded-lg border border-border bg-card p-4">
                {loading ? (
                  <Skeleton className="h-32 w-full" />
                ) : allAssertions.length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(
                      allAssertions.reduce(
                        (acc, a) => {
                          acc[a.chain] = (acc[a.chain] || 0) + 1;
                          return acc;
                        },
                        {} as Record<string, number>,
                      ),
                    )
                      .sort(([, a], [, b]) => b - a)
                      .map(([chain, count]) => (
                        <div key={chain} className="flex items-center justify-between">
                          <span className="capitalize">{chain}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-32 rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${(count / allAssertions.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">{t('common.noData')}</p>
                )}
              </div>
            </ContentSection>
          </div>
        </TabPanelWrapper>
      </ProtocolPageLayout>
      {selectedDispute && (
        <DisputeDetailModal
          dispute={selectedDispute}
          open={disputeModalOpen}
          onOpenChange={setDisputeModalOpen}
        />
      )}
      {selectedAssertion && (
        <AssertionDetailModal
          assertion={selectedAssertion}
          open={assertionModalOpen}
          onOpenChange={setAssertionModalOpen}
        />
      )}
      {selectedVoterAddress && (
        <VoterHistoryModal
          voterAddress={selectedVoterAddress}
          open={voterModalOpen}
          onOpenChange={setVoterModalOpen}
        />
      )}
    </>
  );
}
