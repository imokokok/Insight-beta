'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Shield, Clock, BarChart3, Scale, Gavel, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProtocolPageLayout } from '@/components/features/protocol/ProtocolPageLayout';
import { FeedTable } from '@/components/features/protocol/FeedTable';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatTimeAgo } from '@/lib/utils/format';
import type { UMAAssertion, UMADispute } from '@/lib/types/protocol';

interface UMAStats {
  totalAssertions: number;
  activeAssertions: number;
  totalDisputes: number;
  activeDisputes: number;
  totalValueSecured: string;
  avgResolutionTime: number;
}

export default function UMAMonitorPage() {
  const [assertions, setAssertions] = useState<UMAAssertion[]>([]);
  const [disputes, setDisputes] = useState<UMADispute[]>([]);
  const [stats, setStats] = useState<UMAStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUMAData = useCallback(async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockAssertions: UMAAssertion[] = [
        {
          id: '0x1234...5678',
          claim: 'ETH price is $3,250 at 2024-01-15 12:00:00 UTC',
          bond: 5000,
          assertionTime: new Date(Date.now() - 3600000).toISOString(),
          expirationTime: new Date(Date.now() + 3600000).toISOString(),
          status: 'pending',
          asserter: '0xabcd...efgh',
          disputeCount: 0,
        },
        {
          id: '0x8765...4321',
          claim: 'BTC price is $67,500 at 2024-01-15 12:00:00 UTC',
          bond: 10000,
          assertionTime: new Date(Date.now() - 86400000).toISOString(),
          expirationTime: new Date(Date.now() - 1800000).toISOString(),
          status: 'settled',
          asserter: '0xijkl...mnop',
          disputeCount: 1,
          settlementTime: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: '0xabcd...efgh',
          claim: 'LINK price is $18.50 at 2024-01-15 12:00:00 UTC',
          bond: 3000,
          assertionTime: new Date(Date.now() - 7200000).toISOString(),
          expirationTime: new Date(Date.now() + 7200000).toISOString(),
          status: 'disputed',
          asserter: '0xqrst...uvwx',
          disputeCount: 2,
          disputedBy: '0xdefender...123',
        },
      ];

      const mockDisputes: UMADispute[] = [
        {
          id: '0xdispute1',
          assertionId: '0xabcd...efgh',
          disputer: '0xdefender...123',
          disputeTime: new Date(Date.now() - 3600000).toISOString(),
          status: 'pending',
          bond: 1500,
        },
        {
          id: '0xdispute2',
          assertionId: '0x8765...4321',
          disputer: '0xchallenger...456',
          disputeTime: new Date(Date.now() - 86400000).toISOString(),
          status: 'resolved',
          bond: 2000,
          outcome: 'valid',
        },
      ];

      const mockStats: UMAStats = {
        totalAssertions: 15420,
        activeAssertions: 342,
        totalDisputes: 1250,
        activeDisputes: 18,
        totalValueSecured: '$2.4B',
        avgResolutionTime: 48,
      };

      setAssertions(mockAssertions);
      setDisputes(mockDisputes);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch UMA data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUMAData();
    const interval = setInterval(fetchUMAData, 30000);
    return () => clearInterval(interval);
  }, [fetchUMAData]);

  const statsContent = stats && (
    <>
      <StatCard
        title="Total Assertions"
        value={stats.totalAssertions.toLocaleString()}
        icon={<Scale className="h-5 w-5" />}
        color="blue"
        subtitle={`${stats.activeAssertions} active`}
      />
      <StatCard
        title="Total Disputes"
        value={stats.totalDisputes.toLocaleString()}
        icon={<Gavel className="h-5 w-5" />}
        color="orange"
        subtitle={`${stats.activeDisputes} active`}
      />
      <StatCard
        title="Value Secured"
        value={stats.totalValueSecured}
        icon={<Shield className="h-5 w-5" />}
        color="green"
      />
      <StatCard
        title="Avg Resolution"
        value={`${stats.avgResolutionTime}h`}
        icon={<Clock className="h-5 w-5" />}
        color="purple"
      />
    </>
  );

  const quickActionsContent = (
    <>
      <Link href="/oracle/optimistic/assertions">
        <Button variant="outline" size="sm" className="gap-2">
          <Scale className="h-4 w-4" />
          All Assertions
        </Button>
      </Link>
      <Link href="/oracle/optimistic/disputes">
        <Button variant="outline" size="sm" className="gap-2">
          <Gavel className="h-4 w-4" />
          All Disputes
        </Button>
      </Link>
      <Link href="/oracle/optimistic/governance">
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          Governance
        </Button>
      </Link>
    </>
  );

  const assertionColumns = [
    { key: 'id', header: 'ID' },
    { key: 'claim', header: 'Claim' },
    {
      key: 'bond',
      header: 'Bond',
      render: (value: unknown) => <span>{Number(value).toLocaleString()} UMA</span>,
    },
    {
      key: 'expirationTime',
      header: 'Expires',
      render: (value: unknown) => (
        <span className="text-sm text-gray-500">{formatTimeAgo(String(value))}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: unknown) => (
        <StatusBadge status={String(value) as 'pending' | 'settled' | 'disputed' | 'expired'} />
      ),
    },
    { key: 'disputeCount', header: 'Disputes' },
  ];

  const disputeColumns = [
    { key: 'id', header: 'ID' },
    { key: 'assertionId', header: 'Assertion ID' },
    { key: 'disputer', header: 'Disputer' },
    {
      key: 'disputeTime',
      header: 'Time',
      render: (value: unknown) => (
        <span className="text-sm text-gray-500">{formatTimeAgo(String(value))}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: unknown) => <StatusBadge status={String(value) as 'pending' | 'resolved'} />,
    },
    {
      key: 'bond',
      header: 'Reward',
      render: (value: unknown) => <span>{Number(value).toLocaleString()} UMA</span>,
    },
  ];

  const tabs = [
    {
      id: 'assertions',
      label: 'Assertions',
      icon: <Scale className="h-4 w-4" />,
      content: (
        <FeedTable
          feeds={assertions as unknown as Record<string, unknown>[]}
          columns={assertionColumns}
          title="Active Assertions"
        />
      ),
    },
    {
      id: 'disputes',
      label: 'Disputes',
      icon: <Gavel className="h-4 w-4" />,
      content: (
        <FeedTable
          feeds={disputes as unknown as Record<string, unknown>[]}
          columns={disputeColumns}
          title="Recent Disputes"
        />
      ),
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="h-4 w-4" />,
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 font-semibold">Assertion Statistics</h3>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span>94.5%</span>
                  </div>
                  <Progress value={94.5} />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Dispute Rate</span>
                    <span>5.5%</span>
                  </div>
                  <Progress value={5.5} />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Average Bond Size</span>
                    <span>8,500 UMA</span>
                  </div>
                  <Progress value={85} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 font-semibold">About UMA</h3>
              <p className="mb-3 text-sm text-gray-600">
                UMA (Universal Market Access) is an optimistic oracle that uses economic guarantees
                to secure smart contracts and enable trustless data verification.
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>Optimistic oracle with economic security</li>
                <li>Data Verification Mechanism (DVM) for disputes</li>
                <li>Supports any type of data or outcome</li>
                <li>Secures billions in value across DeFi</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <ProtocolPageLayout
      protocol="uma"
      title="UMA Optimistic Oracle"
      description="Universal Market Access - Optimistic Oracle Monitoring"
      icon="⚖️"
      officialUrl="https://umaproject.org"
      loading={loading}
      onRefresh={fetchUMAData}
      stats={statsContent}
      chainSelector={quickActionsContent}
      tabs={tabs}
      defaultTab="assertions"
    />
  );
}
