'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  BarChart3,
  Scale,
  Gavel,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UMAAssertion {
  id: string;
  claim: string;
  bond: string;
  liveness: number;
  expirationTime: string;
  status: 'pending' | 'expired' | 'disputed' | 'settled';
  proposer: string;
  disputeCount: number;
}

interface UMADispute {
  id: string;
  assertionId: string;
  disputer: string;
  timestamp: string;
  status: 'active' | 'resolved';
  reward: string;
}

interface UMAStats {
  totalAssertions: number;
  activeAssertions: number;
  totalDisputes: number;
  activeDisputes: number;
  totalValueSecured: string;
  avgResolutionTime: number;
}

export default function UMAMonitorPage() {
  const router = useRouter();
  const [assertions, setAssertions] = useState<UMAAssertion[]>([]);
  const [disputes, setDisputes] = useState<UMADispute[]>([]);
  const [stats, setStats] = useState<UMAStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assertions');

  useEffect(() => {
    fetchUMAData();
    const interval = setInterval(fetchUMAData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchUMAData() {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockAssertions: UMAAssertion[] = [
        {
          id: '0x1234...5678',
          claim: 'ETH price is $3,250 at 2024-01-15 12:00:00 UTC',
          bond: '5,000 UMA',
          liveness: 7200,
          expirationTime: new Date(Date.now() + 3600000).toISOString(),
          status: 'pending',
          proposer: '0xabcd...efgh',
          disputeCount: 0,
        },
        {
          id: '0x8765...4321',
          claim: 'BTC price is $67,500 at 2024-01-15 12:00:00 UTC',
          bond: '10,000 UMA',
          liveness: 7200,
          expirationTime: new Date(Date.now() - 1800000).toISOString(),
          status: 'settled',
          proposer: '0xijkl...mnop',
          disputeCount: 1,
        },
        {
          id: '0xabcd...efgh',
          claim: 'LINK price is $18.50 at 2024-01-15 12:00:00 UTC',
          bond: '3,000 UMA',
          liveness: 7200,
          expirationTime: new Date(Date.now() + 7200000).toISOString(),
          status: 'disputed',
          proposer: '0xqrst...uvwx',
          disputeCount: 2,
        },
      ];

      const mockDisputes: UMADispute[] = [
        {
          id: '0xdispute1',
          assertionId: '0xabcd...efgh',
          disputer: '0xdefender...123',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'active',
          reward: '1,500 UMA',
        },
        {
          id: '0xdispute2',
          assertionId: '0x8765...4321',
          disputer: '0xchallenger...456',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          status: 'resolved',
          reward: '2,000 UMA',
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
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case 'settled':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="mr-1 h-3 w-3" />
            Settled
          </Badge>
        );
      case 'disputed':
        return (
          <Badge className="bg-red-100 text-red-700">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Disputed
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-gray-100 text-gray-700">
            <Clock className="mr-1 h-3 w-3" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  }

  function formatTimeAgo(timestamp: string): string {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/oracle')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-4xl">⚖️</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">UMA Optimistic Oracle</h1>
                <p className="text-sm text-gray-500">
                  Universal Market Access - Optimistic Oracle Monitoring
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchUMAData} disabled={loading} className="gap-2">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Link href="https://umaproject.org" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Official Site
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
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
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="assertions" className="gap-2">
              <Scale className="h-4 w-4" />
              Assertions
            </TabsTrigger>
            <TabsTrigger value="disputes" className="gap-2">
              <Gavel className="h-4 w-4" />
              Disputes
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assertions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Assertions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-gray-500">
                        <th className="pb-3 font-medium">ID</th>
                        <th className="pb-3 font-medium">Claim</th>
                        <th className="pb-3 font-medium">Bond</th>
                        <th className="pb-3 font-medium">Expires</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Disputes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assertions.map((assertion) => (
                        <tr key={assertion.id} className="border-b last:border-0">
                          <td className="py-4 font-mono text-sm">{assertion.id}</td>
                          <td className="max-w-md truncate py-4">{assertion.claim}</td>
                          <td className="py-4">{assertion.bond}</td>
                          <td className="py-4 text-sm text-gray-500">
                            {formatTimeAgo(assertion.expirationTime)}
                          </td>
                          <td className="py-4">{getStatusBadge(assertion.status)}</td>
                          <td className="py-4">{assertion.disputeCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Disputes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-gray-500">
                        <th className="pb-3 font-medium">ID</th>
                        <th className="pb-3 font-medium">Assertion ID</th>
                        <th className="pb-3 font-medium">Disputer</th>
                        <th className="pb-3 font-medium">Time</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Reward</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disputes.map((dispute) => (
                        <tr key={dispute.id} className="border-b last:border-0">
                          <td className="py-4 font-mono text-sm">{dispute.id}</td>
                          <td className="py-4 font-mono text-sm">{dispute.assertionId}</td>
                          <td className="py-4 font-mono text-sm">{dispute.disputer}</td>
                          <td className="py-4 text-sm text-gray-500">
                            {formatTimeAgo(dispute.timestamp)}
                          </td>
                          <td className="py-4">
                            <Badge variant={dispute.status === 'active' ? 'default' : 'secondary'}>
                              {dispute.status}
                            </Badge>
                          </td>
                          <td className="py-4">{dispute.reward}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Assertion Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>About UMA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <p>
                    UMA (Universal Market Access) is an optimistic oracle that uses economic
                    guarantees to secure smart contracts and enable trustless data verification.
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>Optimistic oracle with economic security</li>
                    <li>Data Verification Mechanism (DVM) for disputes</li>
                    <li>Supports any type of data or outcome</li>
                    <li>Secures billions in value across DeFi</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={cn('rounded-lg p-3', colorClasses[color])}>{icon}</div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
