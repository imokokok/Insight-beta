'use client';

import { useState, useCallback, useMemo } from 'react';

import { Gavel, TrendingUp, LayoutDashboard, Users } from 'lucide-react';

import { ContentSection, ContentGrid } from '@/components/common';
import { useProtocolData } from '@/components/oracle/hooks/useProtocolData';
import {
  ProtocolPageLayout,
  TabPanelWrapper,
  type TabItem,
  type KpiCardData,
} from '@/components/oracle/layouts/ProtocolPageLayout';
import { Badge } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatTime } from '@/shared/utils/format/date';
import { cn } from '@/shared/utils/ui';
import type { NetworkHealthStatus } from '@/types/common';

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

interface AssertionsResponse {
  assertions: Assertion[];
  total: number;
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
  { id: 'voters', label: t('uma.tabs.voters'), icon: <Users className="h-4 w-4" /> },
  { id: 'analysis', label: t('uma.tabs.analysis'), icon: <TrendingUp className="h-4 w-4" /> },
];

export default function UmaPage() {
  const { t } = useI18n();
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  const TABS = useMemo(() => getTabs(t), [t]);

  const { data, isLoading, isRefreshing, isError, error, lastUpdated, refresh } =
    useProtocolData<UmaDashboardData>({
      protocol: 'uma',
      endpoint: '/api/oracle/uma/dashboard',
      refreshInterval: autoRefreshEnabled ? refreshInterval : 0,
      enabled: true,
      transformData: transformUmaData,
    });

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

  const breadcrumbItems = useMemo(
    () => [{ label: t('nav.protocols'), href: '/protocols' }, { label: 'UMA' }],
    [t],
  );

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

  const assertions = data?.assertionsData?.assertions ?? [];
  const voters = data?.votersData?.voters ?? [];
  const loading = isLoading || isRefreshing;

  const statusCounts = {
    pending: assertions.filter((a) => a.status === 'pending').length,
    disputed: assertions.filter((a) => a.status === 'disputed').length,
    resolved: assertions.filter((a) => a.status === 'resolved').length,
    settled: assertions.filter((a) => a.status === 'settled').length,
  };

  return (
    <ProtocolPageLayout
      protocol="uma"
      title="UMA"
      icon={<Gavel className="h-5 w-5" />}
      description={t('uma.description')}
      healthStatus={healthStatus}
      kpiCards={kpiCards}
      tabs={TABS}
      breadcrumbItems={breadcrumbItems}
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
              ) : assertions.length > 0 ? (
                <div className="space-y-3">
                  {assertions.slice(0, 5).map((assertion) => (
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
                <p className="text-2xl font-bold">{statusCounts.resolved + statusCounts.settled}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">{t('uma.overview.successRate')}</p>
                <p className="text-2xl font-bold">
                  {assertions.length > 0
                    ? `${Math.round((statusCounts.settled / assertions.length) * 100)}%`
                    : 'N/A'}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">{t('uma.overview.avgBond')}</p>
                <p className="text-2xl font-bold">
                  {assertions.length > 0
                    ? `$${Math.round(
                        assertions.reduce((sum, a) => sum + Number(a.bond), 0) / assertions.length,
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
                      <tr key={assertion.id} className="hover:bg-muted/50">
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
                        <td className="px-4 py-3 font-mono text-sm">
                          {voter.address.slice(0, 6)}...{voter.address.slice(-4)}
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
          <ContentSection title={t('uma.analysis.statusDistribution')}>
            <ContentGrid columns={4}>
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-yellow-500">{statusCounts.pending}</p>
                <p className="text-sm text-muted-foreground">{t('uma.status.pending')}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-red-500">{statusCounts.disputed}</p>
                <p className="text-sm text-muted-foreground">{t('uma.status.disputed')}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-green-500">{statusCounts.resolved}</p>
                <p className="text-sm text-muted-foreground">{t('uma.status.resolved')}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <p className="text-3xl font-bold text-blue-500">{statusCounts.settled}</p>
                <p className="text-sm text-muted-foreground">{t('uma.status.settled')}</p>
              </div>
            </ContentGrid>
          </ContentSection>

          <ContentSection title={t('uma.analysis.chainDistribution')}>
            <div className="rounded-lg border border-border bg-card p-4">
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : assertions.length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(
                    assertions.reduce(
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
                              style={{ width: `${(count / assertions.length) * 100}%` }}
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
  );
}
