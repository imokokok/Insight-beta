'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import { useAutoRefreshWithCountdown, useDataCache } from '@/hooks';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { useI18n } from '@/i18n';
import { logger } from '@/shared/logger';
import { fetchApiData } from '@/shared/utils';

import type { DisputeReport, Dispute, DisputerStats } from '../types/disputes';

function generateMockDisputeReport(): DisputeReport {
  const now = new Date();
  const disputes: Dispute[] = [];
  const topDisputers: DisputerStats[] = [];
  const trends = [];

  const protocols = ['uma', 'insight'];
  const chains = ['ethereum', 'polygon', 'arbitrum'];

  const addresses = [
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD',
    '0x123a456B78901234567890123456789012345678',
    '0xabcdef1234567890abcdef1234567890abcdef12',
    '0x111122223333444455556666777788889999aaaa',
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  ];

  const claims = [
    'ETH/USD price will be > 3000 on 2026-03-01',
    'BTC dominance will be < 50% in Q1 2026',
    'Total TVL in DeFi will exceed 200B by end of 2026',
    'Polygon zkEVM will have > 1M daily active addresses',
    'USDC depegging event will not occur in 2026',
  ];

  for (let i = 0; i < 15; i++) {
    const isResolved = i < 8;
    const proposedAt = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
    const disputedAt = new Date(proposedAt.getTime() + Math.random() * 48 * 60 * 60 * 1000);
    const settledAt = isResolved ? new Date(disputedAt.getTime() + Math.random() * 72 * 60 * 60 * 1000) : undefined;

    disputes.push({
      id: `dispute-${i}`,
      assertionId: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      protocol: protocols[Math.floor(Math.random() * protocols.length)],
      chain: chains[Math.floor(Math.random() * chains.length)],
      disputer: addresses[Math.floor(Math.random() * addresses.length)],
      asserter: addresses[Math.floor(Math.random() * addresses.length)],
      claim: claims[Math.floor(Math.random() * claims.length)],
      bond: 100 + Math.random() * 5000,
      disputeBond: 100 + Math.random() * 10000,
      currency: 'WETH',
      status: isResolved ? 'resolved' : 'active',
      resolutionResult: isResolved ? Math.random() > 0.5 : undefined,
      proposedAt: proposedAt.toISOString(),
      disputedAt: disputedAt.toISOString(),
      settledAt: settledAt?.toISOString(),
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      blockNumber: 18000000 + i * 1000,
    });
  }

  for (let i = 0; i < 5; i++) {
    const totalDisputes = 5 + Math.floor(Math.random() * 50);
    const successfulDisputes = Math.floor(totalDisputes * (0.3 + Math.random() * 0.6));
    topDisputers.push({
      address: addresses[i],
      totalDisputes,
      successfulDisputes,
      winRate: (successfulDisputes / totalDisputes) * 100,
      totalBonded: 1000 + Math.random() * 50000,
      totalRewards: 500 + Math.random() * 20000,
      firstDisputeAt: new Date(now.getTime() - (90 + Math.random() * 270) * 24 * 60 * 60 * 1000).toISOString(),
      lastDisputeAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  for (let i = 30; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString();
    trends.push({
      timestamp,
      totalDisputes: Math.floor(2 + Math.random() * 8),
      activeDisputes: Math.floor(1 + Math.random() * 5),
      resolvedDisputes: Math.floor(1 + Math.random() * 6),
      disputeRate: 0.1 + Math.random() * 0.3,
    });
  }

  return {
    generatedAt: now.toISOString(),
    period: {
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: now.toISOString(),
    },
    summary: {
      totalDisputes: disputes.length,
      activeDisputes: disputes.filter(d => d.status === 'active').length,
      resolvedDisputes: disputes.filter(d => d.status === 'resolved').length,
      totalBonded: disputes.reduce((sum, d) => sum + d.bond + d.disputeBond, 0),
      disputeRate: 0.15,
      successRate: 62.5,
      avgResolutionTimeHours: 48,
    },
    disputes,
    trends,
    topDisputers,
    recentActivity: disputes.slice(0, 5),
  };
}

export function useDisputeAnalytics() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DisputeReport | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [selectedDisputer, setSelectedDisputer] = useState<DisputerStats | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Resolved'>('All');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { t } = useI18n();

  const { getCachedData, setCachedData } = useDataCache<{
    report: DisputeReport;
  }>({ key: 'dispute_dashboard', ttl: 5 * 60 * 1000 });

  const fetchReport = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        const cached = getCachedData();
        if (cached && !lastUpdated) {
          setReport(cached.report);
          setLoading(false);
          return;
        }

        const mockReport = generateMockDisputeReport();
        setReport(mockReport);
        setLastUpdated(new Date());

        setCachedData({
          report: mockReport,
        });
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : t('analytics:disputes.failedToLoad');
        setError(errorMessage);
        logger.error('Failed to fetch dispute report', { error: err });
      } finally {
        setLoading(false);
      }
    },
    [getCachedData, setCachedData, lastUpdated, t],
  );

  const {
    isEnabled: autoRefreshEnabled,
    setIsEnabled: setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
  } = useAutoRefreshWithCountdown({
    onRefresh: fetchReport,
    interval: 60000,
    enabled: true,
    pauseWhenHidden: true,
  });

  usePageOptimizations({
    pageName: t('analytics:disputes.pageName'),
    onRefresh: async () => {
      await refresh();
    },
    enableSearch: true,
    searchSelector: 'input[type="text"][placeholder*="' + t('analytics:disputes.searchPlaceholder') + '"]',
    showRefreshToast: true,
  });

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filteredDisputes = useMemo(
    () =>
      report?.disputes.filter(
        (dispute) => {
          const matchesStatus = filterStatus === 'All' || 
            (filterStatus === 'Active' && dispute.status === 'active') ||
            (filterStatus === 'Resolved' && dispute.status === 'resolved');
          const matchesSearch = !searchQuery ||
            dispute.claim.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dispute.disputer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dispute.asserter.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesStatus && matchesSearch;
        },
      ) || [],
    [report, searchQuery, filterStatus],
  );

  const handleExport = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispute-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  return {
    loading,
    report,
    selectedDispute,
    setSelectedDispute,
    selectedDisputer,
    setSelectedDisputer,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    lastUpdated,
    error,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
    fetchReport,
    filteredDisputes,
    handleExport,
  };
}
